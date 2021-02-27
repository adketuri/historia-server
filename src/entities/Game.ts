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
import { Favorite } from "./Favorite";
import { User } from "./User";

@ObjectType()
@Entity()
export class Game extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

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

  @Field()
  @ManyToOne(() => User, (user) => user.submissions)
  submitter: User;

  @Field(() => Int)
  @Column({ default: 0 })
  favoriteCount: number;

  @OneToMany(() => Favorite, (favorite) => favorite.game)
  favorites: Favorite[];

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
