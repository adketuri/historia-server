import { User } from "../entities/User";
import { MyContext } from "../types";
import { MiddlewareFn } from "type-graphql";

// Checks if user is authenticated + an admin
export const isAdmin: MiddlewareFn<MyContext> = async ({ context }, next) => {
  if (!context.req.session.userId) throw new Error("User is not authenticated");
  const user = await User.findOne(context.req.session.userId);
  if (!user) throw new Error("User doesn't exist");
  if (!user.isAdmin) throw new Error("User is not an admin");
  return next();
};
