import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Therapists",
};

export default function TherapistsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
