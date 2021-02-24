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
import { User } from "./User";

@ObjectType()
@Entity()
export class Game extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column({ nullable: true })
  author: string;

  @Field()
  @Column({ nullable: true })
  year: number;

  @Field()
  @Column({ nullable: true })
  shortDescription: string;

  @Field()
  @Column({ nullable: true })
  longDescription: string;

  @Field()
  @Column({ nullable: true })
  thumbnail: string;

  @Field()
  @Column({ nullable: true })
  banner: string;

  @Field()
  @Column({ type: "int", default: 0 })
  points!: number;

  @Field()
  @Column()
  submitterId: number;

  @ManyToOne(() => User, (user) => user.submissions)
  submitter: User;

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date;
}
