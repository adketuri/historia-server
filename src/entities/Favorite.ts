import { BaseEntity, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { Game } from "./Game";
import { User } from "./User";

@Entity()
export class Favorite extends BaseEntity {
  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => User)
  user: User;

  @PrimaryColumn()
  gameId: number;

  @ManyToOne(() => Game)
  game: Game;
}
