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
import { Post } from "../entities/Post";
import { weekNumber } from "../utils/weekNumber";
import { random } from "../utils/random";
import { Download } from "../entities/Download";
import { isSubmitter } from "../middleware/isSubmitter";
import { isAdmin } from "../middleware/isAdmin";

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
  tags: string;
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
class HomepageResponse {
  @Field(() => [Game])
  promotedGames: Game[];

  @Field(() => [Screenshot])
  newScreenshots: Screenshot[];

  @Field(() => [Post])
  newPosts: Post[];

  @Field(() => [Game])
  newGames: Game[];
}

@ObjectType()
class PaginatedGames {
  @Field(() => [Game])
  games: Game[];
  @Field()
  hasMore: boolean;
}

function validateInput(input: GameInput): FieldError[] | undefined {
  const errors: FieldError[] = [];
  if (input.title.length < 1) {
    errors.push({
      field: "title",
      message: "Title must be at least 1 character.",
    });
  }
  if (errors.length > 0) return errors;
  return undefined;
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
      return false;
    }

    const favorited = await favoriteLoader.load({
      gameId: game.id,
      userId: req.session.userId,
    });
    return !!favorited;
  }

  @Mutation(() => Download)
  @UseMiddleware(isSubmitter)
  async createDownload(
    @Arg("gameId", () => Int) gameId: number,
    @Arg("url", () => String) url: string,
    @Ctx() { req }: MyContext
  ): Promise<Download | undefined> {
    // Get the game, it must exist to add downloads
    const game = await Game.findOne(gameId, { relations: ["downloads"] });
    if (!game) throw Error("No game with that id");

    // Get the user and their downloads
    const user = await User.findOne(req.session.userId, {
      relations: ["downloads"],
    });
    if (!user) throw Error("No user to load!");

    // Create the new download
    const download = await Download.create({
      url,
      game,
      submitter: user,
      verified: user.isSubmitter || user.isAdmin,
    }).save();

    // Associate with user+game and save those
    user.downloads.push(download);
    game.downloads.push(download);
    await user.save();
    await game.save();

    return download;
  }

  @Mutation(() => Screenshot)
  @UseMiddleware(isSubmitter)
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
      verified: user.isAdmin || user.isSubmitter,
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

  @Query(() => HomepageResponse)
  async homepage(): Promise<HomepageResponse | undefined> {
    // This is a little awkward but it's deterministic at least
    // 1. Get all games (only with favorites down the road?)
    // 2. Seed three random numbers based on the week number
    // 3. Index into the favorites list based on those numbers
    const qb = getConnection()
      .createQueryBuilder()
      .select("game")
      .from(Game, "game")
      // .where("game.favoriteCount > 0")
      .orderBy("game.createdAt", "DESC")
      .leftJoinAndSelect("game.posts", "posts")
      .leftJoinAndSelect("posts.author", "users")
      .leftJoinAndSelect("game.screenshots", "screenshots")
      .leftJoinAndSelect("game.downloads", "downloads");
    const allGames = await qb.getMany();

    // Add up to 3 games, ensuring there are no duplicates
    const promotedGames: Game[] = [];
    var seed = weekNumber(new Date());
    var gamesAdded = 0;
    while (gamesAdded < Math.min(3, allGames.length)) {
      var idx = Math.floor(random(seed++) * allGames.length);
      if (!promotedGames.find((g) => g.id === allGames[idx].id)) {
        promotedGames.push(allGames[idx]);
        gamesAdded++;
      }
    }
    // Add latest screenshots/posts. These ones are a bit more sane.
    const newScreenshots = await Screenshot.find({
      take: 6,
      relations: ["game"],
      order: { createdAt: "DESC" },
    });
    const newPosts = await Post.find({
      take: 5,
      relations: ["game"],
      order: { createdAt: "DESC" },
    });

    return {
      promotedGames,
      newScreenshots,
      newPosts,
      newGames: allGames.slice(0, Math.min(10, allGames.length)),
    };
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
      .orderBy(`posts."createdAt"`, "ASC")
      .leftJoinAndSelect("posts.author", "users")
      .leftJoinAndSelect("game.screenshots", "screenshots")
      .leftJoinAndSelect("game.downloads", "downloads")
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
    qb.leftJoinAndSelect("game.posts", "posts")
      // .orderBy(`posts."createdAt"`, "ASC") // TODO: this breaks game listing?
      .leftJoinAndSelect("posts.author", "users")
      .leftJoinAndSelect("game.screenshots", "screenshots")
      .leftJoinAndSelect("game.downloads", "downloads")
      .orderBy("game.createdAt", "DESC")
      .take(realLimit + 1);
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
    const gid = id ? id : await redis.get(SLUG_PREFIX + slug);

    const qb = getConnection()
      .createQueryBuilder()
      .select("game")
      .from(Game, "game")
      .where("game.id = :id", { id: gid })
      .orderBy("game.createdAt", "DESC")
      .leftJoinAndSelect("game.posts", "posts")
      .orderBy(`posts."createdAt"`, "ASC")
      .leftJoinAndSelect("posts.author", "users")
      .leftJoinAndSelect("game.screenshots", "screenshots")
      .leftJoinAndSelect("game.downloads", "downloads");
    return await qb.getOne();
  }

  @Mutation(() => GameResponse)
  @UseMiddleware(isSubmitter)
  async updateGame(
    @Arg("id", () => Int!) id: number,
    @Arg("input") input: GameInput,
    @Ctx() { req, redis }: MyContext
  ): Promise<GameResponse> {
    const user = await User.findOne(req.session.userId);
    const game = await Game.findOne(id);
    if (!game) throw new Error("No game exists with that id");

    if (game.submitter.id !== user?.id && !user?.isAdmin) {
      throw new Error("User does not have permission to update this game.");
    }

    try {
      const inputErrors = validateInput(input);
      if (inputErrors) return { errors: inputErrors };
      game.title = input.title;
      game.shortDescription = input.shortDescription;
      game.longDescription = input.longDescription;
      game.tags = input.tags;
      game.author = input.author;
      game.year = input.year;
      if (input.thumbnail) game.thumbnail = input.thumbnail;
      if (input.banner) game.banner = input.banner;
      game.save();
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

  @Mutation(() => GameResponse)
  @UseMiddleware(isSubmitter)
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

  @Mutation(() => Boolean)
  @UseMiddleware(isAdmin)
  async deleteGame(@Arg("id") id: number): Promise<boolean> {
    await Game.delete({ id: id });
    return true;
  }
}
