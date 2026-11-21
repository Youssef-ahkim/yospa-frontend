import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Details",
};

export default function ClientDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
