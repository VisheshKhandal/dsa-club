import type { SearchResultDto } from "@/features/platform/dto/platform.dto";
import { searchMongoProvider } from "@/features/platform/services/search.service";

export interface SearchProvider {
  search(query: string, limit?: number): Promise<SearchResultDto[]>;
}

export const mongoSearchProvider: SearchProvider = {
  async search(query, limit) {
    return (await searchMongoProvider(query, limit)).results;
  },
};
