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

import redis from 'redis';
import session from 'express-session';
import connectRedis from 'connect-redis'

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

    const RedisStore = connectRedis(session)
    const redisClient = redis.createClient()
    
    app.use(
      session({
        name: 'qid',
        store: new RedisStore({ 
            client: redisClient,
            disableTouch: true,
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 yrs
            httpOnly: true,
            sameSite: 'lax',
            secure: __prod__
        },
        saveUninitialized: false,
        secret: 'thisshouldbeanenvvariable',
        resave: false,
      })
    )

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver],
            validate: false
        }),
        context: ({req, res}) => ({req, res})
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