import { Field, Int, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Game } from "./Game";
import { User } from "./User";

@ObjectType()
@Entity()
export class Download extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;

  @Field(() => String)
  @Column({ type: "text" })
  url: string;

  @Field(() => Boolean)
  @Column({ type: "boolean", default: false })
  verified: boolean;

  @Field(() => Game)
  @ManyToOne(() => Game, (game) => game.downloads)
  game: Game;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.downloads)
  submitter: User;
}
