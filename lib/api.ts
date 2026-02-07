const BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

export type SearchParams = {
  brand?: string[];
  category?: string;
  sub_category?: string;
  style_tags?: string[];
  colors?: string[];
  materials?: string[];
  use_cases?: string[];
  price_min?: number;
  price_max?: number;
  text?: string;
  limit?: number;
  offset?: number;
};

export type BackendProduct = {
  product_id: string;
  name: string;
  brand: string | null;
  category: string;
  sub_category: string | null;
  price: number | null;
  currency: string | null;
  size: string | null;
  color: string | null;
  material: string | null;
  attributes: Record<string, unknown>;
  product_url: string | null;
  image_path: string | null;
  product_summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

async function api<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(
    `${BASE}${path}`,
    init
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `API ${res.status}: ${body}`
    );
  }
  return res.json();
}

export async function searchProducts(
  params: SearchParams
): Promise<BackendProduct[]> {
  const qs = new URLSearchParams();
  if (params.category)
    qs.set("category", params.category);
  if (params.sub_category)
    qs.set("sub_category", params.sub_category);
  if (params.price_min != null)
    qs.set(
      "price_min",
      String(params.price_min)
    );
  if (params.price_max != null)
    qs.set(
      "price_max",
      String(params.price_max)
    );
  if (params.text)
    qs.set("text", params.text);
  if (params.limit != null)
    qs.set("limit", String(params.limit));
  if (params.offset != null)
    qs.set("offset", String(params.offset));
  for (const v of params.brand ?? [])
    qs.append("brand", v);
  for (const v of params.colors ?? [])
    qs.append("colors", v);
  for (const v of params.materials ?? [])
    qs.append("materials", v);
  for (const v of params.style_tags ?? [])
    qs.append("style_tags", v);
  for (const v of params.use_cases ?? [])
    qs.append("use_cases", v);

  return api<BackendProduct[]>(
    `/read/products/search?${qs}`
  );
}

export async function recordInteraction(
  userId: string,
  productId: string,
  sentiment: "good" | "bad",
  notes?: string
): Promise<void> {
  await api("/write/interaction", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      product_id: productId,
      sentiment,
      sentiment_notes: notes ?? null,
    }),
  });
}

export async function getOrCreateUser(
  userId: string
): Promise<void> {
  try {
    await api(
      `/read/user/` +
        encodeURIComponent(userId)
    );
  } catch {
    await api("/write/user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
      }),
    });
  }
}
