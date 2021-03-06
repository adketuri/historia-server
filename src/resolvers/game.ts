import { Screenshot } from "../entities/Screenshot";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  InputType,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { getConnection, getManager } from "typeorm";
import { SLUG_PREFIX } from "../constants";
import { Favorite } from "../entities/Favorite";
import { Game } from "../entities/Game";
import { User } from "../entities/User";
import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";
import { slugify } from "../utils/slugify";
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

@Resolver(Game)
export class GameResolver {
  @FieldResolver(() => User)
  submitter(@Root() game: Game, @Ctx() { userLoader }: MyContext) {
    return userLoader.load(game.submitterId);
  }

  @FieldResolver(() => String)
  slug(@Root() game: Game, @Ctx() {}: MyContext) {
    return slugify(game);
  }

  @FieldResolver(() => Boolean)
  async favorited(
    @Root() game: Game,
    @Ctx() { favoriteLoader, req }: MyContext
  ) {
    if (!req.session.userId) {
      return null;
    }

    const favorited = await favoriteLoader.load({
      gameId: game.id,
      userId: req.session.userId,
    });
    return !!favorited;
  }

  @Mutation(() => Screenshot)
  @UseMiddleware(isAuth)
  async createScreenshot(
    @Arg("gameId", () => Int) gameId: number,
    @Arg("url", () => String) url: string,
    @Ctx() { req }: MyContext
  ): Promise<Screenshot | undefined> {
    // Get the game, it must exist to add screenshots
    const game = await Game.findOne(gameId, { relations: ["screenshots"] });
    if (!game) throw Error("No game with that id");

    // Get the user and their screenshots
    const user = await User.findOne(req.session.userId, {
      relations: ["screenshots"],
    });
    if (!user) throw Error("No user to load!");

    // Create the new screenshot
    const screenshot = await Screenshot.create({
      url,
      game,
      submitter: user,
      verified: user.isAdmin,
    }).save();

    // Associate with user+game and save those
    user.screenshots.push(screenshot);
    game.screenshots.push(screenshot);
    await user.save();
    await game.save();

    return screenshot;
  }

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
    if (!game) throw Error("No game with that id");

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

  @Query(() => [Game])
  async findGames(
    @Arg("search", () => String) search: string
  ): Promise<Game[]> {
    if (search.length < 2) return [];
    // This has a few pitfalls, namely for non-English searches. see: https://github.com/typeorm/typeorm/issues/1231
    const games = await getConnection()
      .createQueryBuilder()
      .select("game")
      .from(Game, "game")
      .where("LOWER(title) LIKE :title", { title: `%${search.toLowerCase()}%` })
      .leftJoinAndSelect("game.posts", "posts")
      .leftJoinAndSelect("posts.author", "users")
      .leftJoinAndSelect("game.screenshots", "screenshots")
      .getMany();
    return games;
  }

  @Query(() => PaginatedGames)
  async games(
    @Arg("limit", () => Int) limit: number,
    @Arg("cursor", () => String, { nullable: true }) cursor: string | null
  ): Promise<PaginatedGames> {
    const realLimit = Math.min(50, limit);
    const date = new Date(parseInt(cursor || "0"));

    const qb = getConnection()
      .createQueryBuilder()
      .select("game")
      .from(Game, "game");
    if (cursor) {
      qb.where("game.createdAt < :date", { date });
    }
    qb.orderBy("game.createdAt", "DESC");
    qb.limit(realLimit + 1);
    qb.leftJoinAndSelect("game.posts", "posts");
    qb.leftJoinAndSelect("posts.author", "users");
    qb.leftJoinAndSelect("game.screenshots", "screenshots");

    const games = await qb.getMany();
    return {
      games: games.slice(0, realLimit),
      hasMore: games.length === realLimit + 1,
    };
  }

  @Query(() => Game, { nullable: true })
  async game(
    @Ctx() { redis }: MyContext,
    @Arg("id", () => Int, { nullable: true }) id?: number,
    @Arg("slug", { nullable: true }) slug?: string
  ): Promise<Game | undefined> {
    if (slug) {
      // const game = gameSlugLoader.load(slug);
      const idFromSlug = await redis.get(SLUG_PREFIX + slug);
      if (idFromSlug) {
        const game = await Game.findOne(idFromSlug, {
          relations: ["posts", "posts.author", "screenshots"],
        });
        if (game) return game;
      }
    }
    return Game.findOne(id, { relations: ["posts", "post.author"] });
  }

  @Mutation(() => GameResponse)
  @UseMiddleware(isAuth)
  async createGame(
    @Arg("input") input: GameInput,
    @Ctx() { req, redis }: MyContext
  ): Promise<GameResponse> {
    const user = await User.findOne(req.session.userId);
    if (!user?.isSubmitter) throw new Error("User cannot submit games");

    try {
      const game = await Game.create({
        ...input,
        submitter: user,
        submitterId: user.id,
      }).save();
      await redis.set(SLUG_PREFIX + slugify(game), game.id);
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
