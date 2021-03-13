import { User } from "../entities/User";
import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import argon2 from "argon2";
import { MyContext } from "../types";
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "../UsernamePasswordInput";
import { validateRegister } from "../utils/validateRegister";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";
import { Game } from "../entities/Game";
import { Favorite } from "../entities/Favorite";
import { Post } from "../entities/Post";
import { isAuth } from "../middleware/isAuth";

@ObjectType()
export class FieldError {
  @Field()
  field: string;
  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => String)
  email(@Root() user: User, @Ctx() { req }: MyContext) {
    // Conditionally strip away email field if it's not the current user
    if (req.session.userId === user.id) return user.email;
    return null;
  }

  @FieldResolver(() => [Game])
  submissions(@Root() user: User, @Ctx() {}: MyContext) {
    return Game.find({ where: { submitterId: user.id } });
  }

  @FieldResolver(() => [Post])
  posts(@Root() user: User, @Ctx() {}: MyContext) {
    return Post.find({ where: { author: user } });
  }

  @FieldResolver(() => [Game])
  async favorites(@Root() user: User, @Ctx() { gameLoader }: MyContext) {
    // return userLoader.load(game.submitterId);
    const favorites = await Favorite.find({ where: { userId: user.id } });
    let gameIds: number[] = [];
    favorites.forEach((favorite) => {
      gameIds.push(favorite.gameId);
    });
    console.log(gameIds);
    return gameLoader.loadMany(gameIds);
    // return Game.find({ where: { submitterId: user.id } });
  }

  @Mutation(() => UserResponse)
  @UseMiddleware(isAuth)
  async changeProfile(
    @Arg("newProfile") newProfile: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse | undefined> {
    if (newProfile.length > 1000) {
      return {
        errors: [
          {
            field: "profile",
            message: "Please keep profiles under 1000 characters.",
          },
        ],
      };
    }

    const user = await User.findOne(req.session.userId);
    if (!user) throw new Error("Unexpected error finding user from session");
    user.profile = newProfile;
    await user.save();
    return { user };
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { req, redis }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 2) {
      return {
        errors: [
          {
            field: "newPassword",
            message: "Length must be at least three characters",
          },
        ],
      };
    }
    const key = FORGOT_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            message: "Token expired",
          },
        ],
      };
    }

    const userIdNum = parseInt(userId);
    const user = await User.findOne(userIdNum);
    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "User no longer exists",
          },
        ],
      };
    }

    await User.update(
      { id: userIdNum },
      {
        password: await argon2.hash(newPassword),
      }
    );

    req.session.userId = user.id;
    await redis.del(key);

    return { user };
  }

  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOne({ where: { email } });
    if (!user) return true; // email not in db

    // create token, store in redis
    const token = v4();
    await redis.set(
      FORGOT_PASSWORD_PREFIX + token,
      user.id,
      "ex",
      1000 * 60 * 60 * 3
    ); // 3 days

    // send out an email
    const html = `<a href="http://localhost:3000/change-password/${token}">Reset Password</a>`;
    await sendEmail(email, html);
    return true;
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    if (!req.session.userId) return null;
    return User.findOne(req.session.userId);
  }

  @Query(() => User, { nullable: true })
  user(@Arg("username", () => String) username: string) {
    return User.findOne({ where: { username } });
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    let errors = validateRegister(options);
    if (errors) {
      return { errors };
    }

    const hashedPassword = await argon2.hash(options.password);
    try {
      const user = await User.create({
        username: options.username,
        email: options.email,
        password: hashedPassword,
      }).save();
      req.session.userId = user.id;
      return { user };
    } catch (err) {
      console.log(err);
      if (err.code === "23505") {
        return {
          errors: [{ field: "username", message: "Username already exists." }],
        };
      }
      return {
        errors: [
          { field: "username", message: "Unexpected error creating user" },
        ],
      };
    }
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const opts = usernameOrEmail.includes("@")
      ? { email: usernameOrEmail }
      : { username: usernameOrEmail };
    const user = await User.findOne(opts);
    if (!user) {
      return {
        errors: [
          {
            field: "usernameOrPassword",
            message: "That username or email does not exist.",
          },
        ],
      };
    }
    const valid = await argon2.verify(user.password, password);
    if (!valid) {
      return {
        errors: [
          {
            field: "password",
            message: "Password is incorrect.",
          },
        ],
      };
    }

    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }
        resolve(true);
      })
    );
  }
}
