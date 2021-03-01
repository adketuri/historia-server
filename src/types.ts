import { Request, Response } from "express";
import { Session, SessionData } from "express-session";
import { Redis } from "ioredis";
import { createUserLoader } from "./utils/createUserLoader";
import { createFavoriteLoader } from "./utils/createFavoriteLoader";
import { createGameLoader } from "./utils/createGameLoader";

export type MyContext = {
  req: Request & {
    session: Session & Partial<SessionData> & { userId: number };
  };
  userLoader: ReturnType<typeof createUserLoader>;
  favoriteLoader: ReturnType<typeof createFavoriteLoader>;
  gameLoader: ReturnType<typeof createGameLoader>;
  redis: Redis;
  res: Response;
};
