import { Product } from "./types";

const cache = new Map<string, Product>();

export function cacheProducts(
  products: Product[]
) {
  for (const p of products)
    cache.set(p.product_id, p);
}

export function getCachedProduct(
  id: string
): Product | undefined {
  return cache.get(id);
}

export function resolveProducts(
  ids: string[]
): Product[] {
  return ids
    .map((id) => cache.get(id))
    .filter(Boolean) as Product[];
}
