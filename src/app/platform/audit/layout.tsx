import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Audit Logs",
};

export default function PlatformAuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
