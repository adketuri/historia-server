import "reflect-metadata"
import { __prod__ } from "./constants";
import { createConnection } from 'typeorm';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import {buildSchema} from 'type-graphql';
import { HelloResolver } from "./resolvers/hello";
import { Post } from "./entities/Post";
import { User } from "./entities/User";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";

const main = async() => {
    await createConnection({
        type: 'postgres',
        database: 'historia',
        username: 'andrew',
        logging: true,
        synchronize: true,
        entities: [Post, User]
    })
    // const post = Post.create({title: "my post"}).save()
    // console.log("--- POST --- AK")
    // //console.log(post);
    // console.log("---find---");
    // // Post.find().then(value => console.log(value));
    // const allPosts = await Post.find()
    // console.log(allPosts);

    const app = express();

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver],
            validate: false
        }),
    });

    apolloServer.applyMiddleware({app});

    app.get('/', (_, res) => {
        res.send("hello");
    })
    app.listen(4000, () => {
        console.log('Server started');
    })
};

main().catch(err => {
    console.error(err);
});