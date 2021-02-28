import { MyContext } from "src/types";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { getConnection, getManager } from "typeorm";
import { Game } from "../entities/Game";
import { Favorite } from "../entities/Favorite";
import { User } from "../entities/User";
import { isAuth } from "../middleware/isAuth";
import { FieldError } from "./user";

@InputType()
class GameInput {
  @Field()
  title: string;
  @Field({ nullable: true })
  author: string;
  @Field({ nullable: true })
  year: number;
  @Field({ nullable: true })
  shortDescription: string;
  @Field({ nullable: true })
  longDescription: string;
  @Field({ nullable: true })
  thumbnail: string;
  @Field({ nullable: true })
  banner: string;
}

@ObjectType()
class GameResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => Game, { nullable: true })
  game?: Game;
}

@ObjectType()
class PaginatedGames {
  @Field(() => [Game])
  games: Game[];
  @Field()
  hasMore: boolean;
}

@Resolver()
export class GameResolver {
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async favorite(
    @Arg("gameId", () => Int) gameId: number,
    @Arg("add", () => Boolean) add: boolean,

    @Ctx() { req }: MyContext
  ) {
    const { userId } = req.session;

    // Get the game, it must exist to favorite
    const game = await Game.findOne(gameId);
    if (!game) return false;

    // If we already have a favorite, we want to remove. otherwise, add.
    // const add = !(await Favorite.findOne({ where: { userId, gameId } }));

    // Transaction to add/remove and update our game's favorite count
    await getManager().transaction(async (tm) => {
      if (add) {
        await tm.insert(Favorite, { userId, gameId });
      } else {
        await tm.delete(Favorite, { userId, gameId });
      }
      await tm.update(
        Game,
        { id: gameId },
        { favoriteCount: game.favoriteCount + (add ? 1 : -1) }
      );
    });
    return true;
  }

  @Query(() => PaginatedGames)
  async games(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedGames> {
    const realLimit = Math.min(50, limit);

    const replacements: any[] = [realLimit + 1];
    if (cursor) replacements.push(new Date(parseInt(cursor)));

    const games = await getConnection().query(
      `
    select p.*,
    json_build_object(
      'id', u.id,
      'username', u.username,
      'email', u.email,
      'createdAt', u."createdAt",
      'updatedAtAt', u."updatedAt"
      ) submitter
    from game p
    inner join public.user u on u.id = p."submitterId"
    ${cursor ? `where p."createdAt" < $2` : ""}
    order by p."createdAt" DESC
    limit $1
    `,
      replacements
    );

    // const qb = getConnection()
    //   .getRepository(Game)
    //   .createQueryBuilder("g")
    //   .innerJoinAndSelect("'g.submitter", "u", 'u.id = g."submitterId"')
    //   .orderBy(`g."created_at"`, "DESC")
    //   .take(realLimit + 1);
    // if (cursor) {
    //   qb.where('g."createdAt" < :cursor', {
    //     cursor: new Date(parseInt(cursor)),
    //   });
    // }
    // const games = await qb.getMany();
    return {
      games: games.slice(0, realLimit),
      hasMore: games.length === realLimit + 1,
    };
  }

  @Query(() => Game, { nullable: true })
  game(@Arg("id") id: number): Promise<Game | undefined> {
    return Game.findOne(id);
  }

  @Mutation(() => GameResponse)
  @UseMiddleware(isAuth)
  async createGame(
    @Arg("input") input: GameInput,
    @Ctx() { req }: MyContext
  ): Promise<GameResponse> {
    const user = await User.findOne(req.session.userId);
    if (!user?.isSubmitter) throw new Error("User cannot submit games");

    try {
      const game = await Game.create({
        ...input,
        submitterId: user.id,
      }).save();
      return { game };
    } catch (err) {
      console.log(err);
      return {
        errors: [
          {
            field: "title",
            message: "Unknown error?",
          },
        ],
      };
    }
  }

  @Mutation(() => Game, { nullable: true })
  async updateGame(
    @Arg("id") id: number,
    @Arg("title") title: string
  ): Promise<Game | undefined> {
    const game = await Game.findOne(id);
    if (!game) return undefined;
    game.title = title;
    game.updatedAt = new Date();
    Game.update({ id: game.id }, game);
    return game;
  }

  @Mutation(() => Boolean)
  async deleteGame(@Arg("id") id: number): Promise<boolean> {
    await Game.delete({ id: id });
    return true;
  }
}
