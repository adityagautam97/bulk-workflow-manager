import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sitecore Marketplace App",
  description: "Built with Vibecore Studio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
