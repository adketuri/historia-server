import {
  Arg,
  Ctx,
  // FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { getConnection } from "typeorm";
import { Game } from "../entities/Game";
import { Post } from "../entities/Post";
import { User } from "../entities/User";
import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";

@Resolver(Post)
export class PostResolver {
  // @FieldResolver(() => User)
  // author(@Root() post: Post, @Ctx() { userLoader }: MyContext) {
  //   console.log("Field post.author", post.author);
  //   return userLoader.load(post.author.id);
  // }
  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return getConnection()
      .getRepository(Post)
      .createQueryBuilder("post")
      .leftJoinAndSelect("post.author", "user")
      .getMany();
    // return Post.find({ relations: ["user"] });
  }

  @Query(() => Post, { nullable: true })
  post(@Arg("id") id: number): Promise<Post | undefined> {
    return Post.findOne(id);
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Ctx() { req }: MyContext,
    @Arg("gameId", () => Int) gameId: number,
    @Arg("body") body: string
  ): Promise<Post | undefined> {
    if (body.length < 10) {
      throw new Error("Please write a comment with at least ten characters.")!;
    }

    const game = await Game.findOne(gameId, { relations: ["posts"] });
    if (!game) throw new Error("No game with that id");

    const user = await User.findOne(req.session.userId, {
      relations: ["posts"],
    });
    if (!user) throw new Error("No user to load");

    const post = await Post.create({
      body,
      game,
      author: user,
    }).save();
    console.log("Post created", post);
    console.log("user posts", user.posts);
    console.log("game posts", game.posts);

    user.posts.push(post);
    game.posts.push(post);
    await user.save();
    await game.save();

    return post;
  }

  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("id") id: number,
    @Arg("body") body: string
  ): Promise<Post | undefined> {
    const post = await Post.findOne(id);
    if (!post) return undefined;
    post.body = body;
    post.updatedAt = new Date();
    Post.update({ id: post.id }, post);
    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg("id") id: number): Promise<boolean> {
    await Post.delete({ id: id });
    return true;
  }
}
