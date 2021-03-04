import { ApolloServer } from "apollo-server-express";
import connectRedis from "connect-redis";
import cors from "cors";
import express from "express";
import session from "express-session";
import Redis from "ioredis";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";
import { COOKIE_NAME, SLUG_PREFIX, __prod__ } from "./constants";
import { User } from "./entities/User";
import { GameResolver } from "./resolvers/game";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import { createUserLoader } from "./utils/createUserLoader";
import { createFavoriteLoader } from "./utils/createFavoriteLoader";
import { createGameLoader } from "./utils/createGameLoader";
import { Game } from "./entities/Game";
import { slugify } from "./utils/slugify";

const main = async () => {
  await createConnection("default");

  // await Game.delete({});
  // await getConnection().runMigrations();

  await User.update(
    { username: "andrew" },
    {
      isSubmitter: true,
    }
  );

  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis();

  const games = await Game.find();
  games.forEach((game) => {
    redis.set(SLUG_PREFIX + slugify(game), game.id);
  });

  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );
  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 yrs
        httpOnly: true,
        sameSite: "lax",
        secure: __prod__,
      },
      saveUninitialized: false,
      secret: "thisshouldbeanenvvariable",
      resave: false,
    })
  );

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, GameResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({
      req,
      res,
      redis,
      userLoader: createUserLoader(),
      favoriteLoader: createFavoriteLoader(),
      gameLoader: createGameLoader(),
    }),
  });

  apolloServer.applyMiddleware({ app, cors: false });

  app.get("/", (_, res) => {
    res.send("hello");
  });
  app.listen(4000, () => {
    console.log("Server started");
  });
};

main().catch((err) => {
  console.error(err);
});
