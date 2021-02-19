import { User } from "../entities/User";
import { Arg, Field, InputType, Mutation, ObjectType, Resolver } from "type-graphql";
import argon2 from 'argon2';

@InputType()
class UsernamePasswordInput {
    @Field()
    username: string
    @Field()
    password: string
}

@ObjectType()
class FieldError {
    @Field()
    field: string;
    @Field()
    message: string;
}

@ObjectType()
class UserResponse {
    @Field(() => [FieldError], {nullable: true})
    errors?: FieldError[]

    @Field(() => User, {nullable: true})
    user?: User
}

@Resolver()
export class UserResolver {
    @Mutation(() => User)
    async register(@Arg('options') options: UsernamePasswordInput
    ) {
        const hashedPassword = await argon2.hash(options.password);
        const user = User.create({username: options.username, password: hashedPassword}).save();
        return user;
    }

    @Mutation(() => UserResponse)
    async login(@Arg('options') options: UsernamePasswordInput
    ): Promise<UserResponse> {
        const user = await User.findOne({username: options.username})
        if (!user) {
            return {
                errors: [{
                    field: 'username',
                    message: "That username does not exist."
                }]
            };
        }
        const valid = await argon2.verify(user.password, options.password);
        if (!valid){
            return {
                errors: [{
                    field: 'password',
                    message: "Password is incorrect."
                }]
            };
        }
        return { user };
    }
}