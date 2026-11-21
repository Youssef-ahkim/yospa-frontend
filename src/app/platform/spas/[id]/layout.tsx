import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Spa Management",
};

export default function SpaDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
