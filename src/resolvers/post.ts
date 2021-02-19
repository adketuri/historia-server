import { Post } from "../entities/Post";
import { Arg, Mutation, Query, Resolver } from "type-graphql";

@Resolver()
export class PostResolver {
    @Query(() => [Post])
    posts(): Promise<Post[]> {
        return Post.find()
    }

    @Query(() => Post, {nullable: true})
    post(
        @Arg('id') id: number): Promise<Post | undefined> {
        return Post.findOne(id)
    }

    @Mutation(() => Post)
    async createPost(
        @Arg('title') title: string): Promise<Post> {
        const post = Post.create({title: title}).save()
        return post;
    }

    @Mutation(() => Post, {nullable: true})
    async updatePost(
        @Arg('id') id: number,
        @Arg('title') title: string,
        ): Promise<Post | undefined> {
            const post = await Post.findOne(id);
            if (!post) return undefined;
            post.title = title;
            post.updatedAt = new Date();
            Post.update({id: post.id}, post);
            return post;
    }

    @Mutation(() => Boolean)
    async deletePost(
        @Arg('id') id: number): Promise<boolean> {
            await Post.delete({id: id})
            return true;
    }
}