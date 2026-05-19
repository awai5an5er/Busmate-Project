import type { Metadata } from "next";
import "./globals.css";
import { ClientBoot } from "@/components/ClientBoot";

export const metadata: Metadata = {
  title: "BusMate",
  description: "Campus transport platform",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ClientBoot />
        {children}
      </body>
    </html>
  );
}
