import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Platform Support Tickets",
};

export default function PlatformTicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
