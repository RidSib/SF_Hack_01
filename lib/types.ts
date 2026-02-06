export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  color: string;
  image: string;
  rating: number;
  tags: string[];
};

export type MessageRole = "user" | "agent";

export type Message = {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
};

export type ToolCall = {
  name: "show_products" | "highlight_product";
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
