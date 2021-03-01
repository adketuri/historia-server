import DataLoader from "dataloader";
import { Game } from "../entities/Game";

export const createGameLoader = () =>
  new DataLoader<number, Game>(async (gameIds) => {
    const games = await Game.findByIds(gameIds as number[]);
    const gameIdsToGame: Record<number, Game> = {};
    games.forEach((g) => {
      gameIdsToGame[g.id] = g;
    });

    const sortedGames = gameIds.map((gameId) => gameIdsToGame[gameId]);
    return sortedGames;
  });
