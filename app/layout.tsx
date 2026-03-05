import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tech Armor Solutions — Lead Management",
  description: "Internal lead management and email campaign platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
