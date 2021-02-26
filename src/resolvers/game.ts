import { Game } from "../entities/Game";
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
import { MyContext } from "src/types";
import { User } from "../entities/User";
import { isAuth } from "../middleware/isAuth";
import { FieldError } from "./user";
import { getConnection } from "typeorm";

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

@Resolver()
export class GameResolver {
  @Query(() => [Game])
  async games(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null
  ): Promise<Game[]> {
    const realLimit = Math.min(10, limit);
    const qb = getConnection()
      .getRepository(Game)
      .createQueryBuilder("g")
      .orderBy(`"createdAt"`, "DESC")
      .take(realLimit);
    if (cursor) {
      qb.where(`"createdAt" < :cursor`, { cursor: new Date(parseInt(cursor)) });
    }
    return qb.getMany();
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
