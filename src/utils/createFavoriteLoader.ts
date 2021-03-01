import { Favorite } from "../entities/Favorite";
import DataLoader from "dataloader";

// [{gameId: 5, userId: 10}]
// [{gameId: 5, userId: 10, value: 1}]
export const createFavoriteLoader = () =>
  new DataLoader<{ gameId: number; userId: number }, Favorite | null>(
    async (keys) => {
      const favorites = await Favorite.findByIds(keys as any);
      const favoriteIdsToFavorite: Record<string, Favorite> = {};
      favorites.forEach((favorite) => {
        favoriteIdsToFavorite[
          `${favorite.userId}|${favorite.gameId}`
        ] = favorite;
      });
      return keys.map(
        (key) => favoriteIdsToFavorite[`${key.userId}|${key.gameId}`]
      );
    }
  );
