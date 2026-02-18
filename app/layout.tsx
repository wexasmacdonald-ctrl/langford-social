import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Social Admin",
  description: "Instagram post queue admin",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
