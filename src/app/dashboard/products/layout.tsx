import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products & Inventory",
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
