import { Field, Int, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Post } from "./Post";
import { Screenshot } from "./Screenshot";
import { User } from "./User";

@ObjectType()
@Entity()
export class Game extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field(() => String)
  slug: string;

  @Field()
  @Column({ nullable: true })
  title: string;

  @Field({ nullable: true })
  @Column({ type: "text", nullable: true })
  author: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  year: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  shortDescription: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  longDescription: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  thumbnail: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  banner: string;

  @Field()
  @Column()
  submitterId: number;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.submissions)
  submitter: User;

  @Field(() => Boolean)
  favorited: boolean;

  @Field(() => Int)
  @Column({ default: 0 })
  favoriteCount: number;

  @Field(() => [Post], { nullable: true })
  @OneToMany(() => Post, (post) => post.game)
  posts: Post[];

  @Field(() => [Screenshot], { nullable: true })
  @OneToMany(() => Screenshot, (screenshot) => screenshot.game)
  screenshots: Screenshot[];

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
