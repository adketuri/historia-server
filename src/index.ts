import { ApolloServer } from "apollo-server-express";
import connectRedis from "connect-redis";
import cors from "cors";
import "dotenv-safe/config";
import express from "express";
import session from "express-session";
import Redis from "ioredis";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";
import { COOKIE_NAME, SLUG_PREFIX, __prod__ } from "./constants";
import { Game } from "./entities/Game";
import { User } from "./entities/User";
import { GameResolver } from "./resolvers/game";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import { createFavoriteLoader } from "./utils/createFavoriteLoader";
import { createGameLoader } from "./utils/createGameLoader";
import { createUserLoader } from "./utils/createUserLoader";
import { slugify } from "./utils/slugify";

const main = async () => {
  await createConnection({
    type: "postgres",
    url: process.env.DATABASE_URL,
    logging: true,
    synchronize: true,
    migrations: ["dist/migrations/*.js"],
    entities: ["dist/entities/*.js"],
  });

  // await User.delete({});
  // await getConnection().runMigrations();

  await User.update(
    { username: "andrew" },
    {
      isAdmin: true,
      isSubmitter: true,
    }
  );

  const app = express();

  const RedisStore = connectRedis(session);
  const redis = new Redis(process.env.REDIS_URL);

  const games = await Game.find();
  games.forEach((game) => {
    redis.set(SLUG_PREFIX + slugify(game), game.id);
  });

  app.set("trust proxy", 1);
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
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
        //domain: __prod__ ? "rm2k.net" : undefined
      },
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET,
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

  app.use(
    "/s3",
    require("react-dropzone-s3-uploader/s3router")({
      bucket: "rm2k",
      region: "us-east-1", //optional
      signatureVersion: "v4", //optional (use for some amazon regions: frankfurt and others)
      signatureExpires: 60, //optional, number of seconds the upload signed URL should be valid for (defaults to 60)
      headers: { "Access-Control-Allow-Origin": "*" }, // optional
      ACL: "public-read",
      uniquePrefix: false, // (4.0.2 and above) default is true, setting the attribute to false preserves the original filename in S3
    })
  );

  app.get("/", (_, res) => {
    res.send("hello");
  });
  app.listen(parseInt(process.env.PORT), () => {
    console.log("Server started");
  });
};

main().catch((err) => {
  console.error(err);
});
