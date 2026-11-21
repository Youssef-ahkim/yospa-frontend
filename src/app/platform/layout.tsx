import type { Metadata } from "next";
import PlatformClientLayout from "./PlatformClientLayout";

export const metadata: Metadata = {
  title: "Platform",
};

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PlatformClientLayout>{children}</PlatformClientLayout>;
}
