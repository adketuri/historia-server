import { Field, ObjectType } from "type-graphql";
import { BaseEntity, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { Game } from "./Game";
import { User } from "./User";

@ObjectType()
@Entity()
export class Favorite extends BaseEntity {
  @Field()
  @PrimaryColumn()
  userId: number;

  @Field(() => [User])
  @ManyToOne(() => User)
  user: User;

  @Field()
  @PrimaryColumn()
  gameId: number;

  @Field(() => [Game])
  @ManyToOne(() => Game)
  game: Game;
}
