import { ShopProvider } from "@/context/ShopContext";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShopProvider>{children}</ShopProvider>;
}
