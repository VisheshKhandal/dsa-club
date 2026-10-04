"use server";

import { searchMongoProvider } from "@/features/platform/services/search.service";
import { searchQuerySchema } from "@/features/platform/validators/platform.validators";

export async function searchAction(input: unknown) {
  const query = searchQuerySchema.parse(input);
  return (await searchMongoProvider(query.q, query.limit)).results;
}
