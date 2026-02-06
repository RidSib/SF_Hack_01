import { products } from "@/lib/products";
import {
  AgentResponse,
  Message,
  Product,
} from "@/lib/types";

const GREET: AgentResponse = {
  text: "Hi! I'm your shopping assistant. What are you looking for today?",
};

function pickTwo(pool: Product[]): Product[] {
  const shuffled = [...pool].sort(
    () => Math.random() - 0.5
  );
  return shuffled.slice(0, 2);
}

function findByCategory(query: string): Product[] {
  const q = query.toLowerCase();
  const categoryMap: Record<string, string[]> = {
    electronics: [
      "headphone", "earbud", "speaker", "watch",
      "charger", "electronic", "tech", "gadget",
    ],
    fashion: [
      "shoe", "sneaker", "jacket", "hat", "beanie",
      "bag", "tote", "clothes", "fashion", "wear",
    ],
    kitchen: [
      "kitchen", "cook", "knife", "skillet",
      "coffee", "pan", "pot",
    ],
    home: [
      "desk", "chair", "candle", "blanket",
      "home", "furniture", "decor",
    ],
    sports: [
      "yoga", "fitness", "band", "bottle",
      "sport", "exercise", "workout", "gym",
    ],
  };

  for (const [cat, keywords] of Object.entries(
    categoryMap
  )) {
    if (keywords.some((k) => q.includes(k))) {
      return products.filter(
        (p) => p.category === cat
      );
    }
  }
  return products;
}

function filterByColor(
  pool: Product[],
  exclude: string
): Product[] {
  const filtered = pool.filter(
    (p) => p.color.toLowerCase() !== exclude
  );
  return filtered.length >= 2 ? filtered : pool;
}

function filterByPrice(
  pool: Product[],
  max: number
): Product[] {
  const filtered = pool.filter(
    (p) => p.price <= max
  );
  return filtered.length >= 2 ? filtered : pool;
}

function filterCheaper(
  pool: Product[],
  current: Product[]
): Product[] {
  const maxPrice = Math.max(
    ...current.map((p) => p.price)
  );
  return pool.filter((p) => p.price < maxPrice);
}

export async function sendMessage(
  messages: Message[],
  currentProducts: Product[]
): Promise<AgentResponse> {
  // Simulate network delay
  await new Promise((r) =>
    setTimeout(r, 600 + Math.random() * 800)
  );

  if (messages.length === 0) return GREET;

  const last = messages[messages.length - 1];
  const q = last.text.toLowerCase();

  // Preference: left / right
  if (
    q.includes("left") ||
    q.includes("first one")
  ) {
    const kept = currentProducts[0];
    if (!kept) return fallback();
    const pool = products.filter(
      (p) =>
        p.category === kept.category &&
        p.id !== kept.id
    );
    const pair = pickTwo(
      pool.length ? pool : products
    );
    const ids = [kept.id, pair[0]?.id].filter(
      Boolean
    );
    return {
      text: `Great choice! I kept "${kept.name}" and found another option for you.`,
      toolCalls: [
        {
          name: "show_products",
          args: { productIds: ids },
        },
      ],
    };
  }

  if (
    q.includes("right") ||
    q.includes("second one")
  ) {
    const kept = currentProducts[1];
    if (!kept) return fallback();
    const pool = products.filter(
      (p) =>
        p.category === kept.category &&
        p.id !== kept.id
    );
    const pair = pickTwo(
      pool.length ? pool : products
    );
    const ids = [pair[0]?.id, kept.id].filter(
      Boolean
    );
    return {
      text: `Nice pick! I kept "${kept.name}" and found a new companion.`,
      toolCalls: [
        {
          name: "show_products",
          args: { productIds: ids },
        },
      ],
    };
  }

  // Rejection
  if (
    q.includes("don't like") ||
    q.includes("dont like") ||
    q.includes("no") ||
    q.includes("neither") ||
    q.includes("something else")
  ) {
    const exclude = new Set(
      currentProducts.map((p) => p.id)
    );
    const pool = products.filter(
      (p) => !exclude.has(p.id)
    );
    const pair = pickTwo(
      pool.length >= 2 ? pool : products
    );
    return {
      text: "No problem! Here are two different options.",
      toolCalls: [
        {
          name: "show_products",
          args: {
            productIds: pair.map((p) => p.id),
          },
        },
      ],
    };
  }

  // Color exclusion
  const colorMatch = q.match(
    /(?:no|not|don't like|hate)\s+(red|blue|black|white|green|gray|purple|brown|beige|silver)/
  );
  if (colorMatch) {
    const color = colorMatch[1];
    const pool = filterByColor(products, color);
    const pair = pickTwo(pool);
    return {
      text: `Got it, avoiding ${color} items. How about these?`,
      toolCalls: [
        {
          name: "show_products",
          args: {
            productIds: pair.map((p) => p.id),
          },
        },
      ],
    };
  }

  // Price filter
  const priceMatch = q.match(
    /under\s*\$?(\d+)|less than\s*\$?(\d+)|below\s*\$?(\d+)|cheaper/
  );
  if (priceMatch) {
    const limit =
      priceMatch[1] || priceMatch[2] || priceMatch[3];
    if (limit) {
      const pool = filterByPrice(
        products,
        parseInt(limit)
      );
      const pair = pickTwo(pool);
      return {
        text: `Here are options under $${limit}.`,
        toolCalls: [
          {
            name: "show_products",
            args: {
              productIds: pair.map((p) => p.id),
            },
          },
        ],
      };
    }
    // Just "cheaper"
    const pool = filterCheaper(
      products,
      currentProducts
    );
    const pair = pickTwo(
      pool.length >= 2 ? pool : products
    );
    return {
      text: "Here are some more affordable picks!",
      toolCalls: [
        {
          name: "show_products",
          args: {
            productIds: pair.map((p) => p.id),
          },
        },
      ],
    };
  }

  // Show more
  if (
    q.includes("more") ||
    q.includes("other") ||
    q.includes("different")
  ) {
    const exclude = new Set(
      currentProducts.map((p) => p.id)
    );
    const pool = products.filter(
      (p) => !exclude.has(p.id)
    );
    const pair = pickTwo(
      pool.length >= 2 ? pool : products
    );
    return {
      text: "Sure, here are some more options!",
      toolCalls: [
        {
          name: "show_products",
          args: {
            productIds: pair.map((p) => p.id),
          },
        },
      ],
    };
  }

  // Category / initial search
  const categoryPool = findByCategory(q);
  const pair = pickTwo(categoryPool);
  return {
    text:
      pair.length >= 2
        ? "Here are two options I think you'll love!"
        : "Let me show you what I've got!",
    toolCalls: [
      {
        name: "show_products",
        args: {
          productIds: pair.map((p) => p.id),
        },
      },
    ],
  };
}

function fallback(): AgentResponse {
  const pair = pickTwo(products);
  return {
    text: "Let me show you something new!",
    toolCalls: [
      {
        name: "show_products",
        args: {
          productIds: pair.map((p) => p.id),
        },
      },
    ],
  };
}
