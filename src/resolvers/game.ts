import { Game } from "../entities/Game";
import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { MyContext } from "src/types";
import { User } from "../entities/User";
import { isAuth } from "../middleware/isAuth";

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

@Resolver()
export class GameResolver {
  @Query(() => [Game])
  games(): Promise<Game[]> {
    return Game.find();
  }

  @Query(() => Game, { nullable: true })
  game(@Arg("id") id: number): Promise<Game | undefined> {
    return Game.findOne(id);
  }

  @Mutation(() => Game)
  @UseMiddleware(isAuth)
  async createGame(
    @Arg("input") input: GameInput,
    @Ctx() { req }: MyContext
  ): Promise<Game> {
    const user = await User.findOne(req.session.userId);
    if (!user?.isSubmitter) throw new Error("User cannot submit games");

    return Game.create({
      ...input,
      submitterId: user.id,
    }).save();
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
