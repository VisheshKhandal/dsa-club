export type SearchResultDto = {
  title: string;
  href: string;
  category: string;
  description: string;
};

export type ProductSummaryDto = {
  stats: Array<{ label: string; value: string; delta: string }>;
  modules: Array<{ label: string; state: string }>;
};
