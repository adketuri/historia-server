import { MyContext } from "../types";
import { MiddlewareFn } from "type-graphql";

// Checks if user is authenticated
export const isAuth: MiddlewareFn<MyContext> = ({ context }, next) => {
  if (!context.req.session.userId) throw new Error("User is not authenticated");
  return next();
};
