import { Field, Int, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Favorite } from "./Favorite";
import { Game } from "./Game";

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column({ type: "text", unique: true })
  username: string;

  @Column({ type: "text" })
  password: string;

  @Field({ nullable: true })
  @Column({ type: "text", unique: true, nullable: true })
  email: string;

  @Field()
  @Column({ type: "boolean", default: "false" })
  isSubmitter: boolean;

  @OneToMany(() => Game, (game) => game.submitter)
  submissions: Game[];

  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites: Favorite[];

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
