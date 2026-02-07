export type Product = {
  product_id: string;
  name: string;
  brand: string | null;
  category: string;
  sub_category: string | null;
  price: number | null;
  currency: string | null;
  color: string | null;
  material: string | null;
  attributes: Record<string, unknown>;
  image_path: string | null;
  product_url: string | null;
  product_summary: string | null;
};

export type MessageRole = "user" | "agent";

export type Message = {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
};

export type ToolCall = {
  name:
    | "show_products"
    | "highlight_product"
    | "search_products";
  args: Record<string, unknown>;
};

export type AgentResponse = {
  text: string;
  toolCalls?: ToolCall[];
};

export type AgentState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking";
