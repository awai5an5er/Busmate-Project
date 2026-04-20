import type { Metadata } from "next";
import "./globals.css";
import { ClientBoot } from "@/components/ClientBoot";

export const metadata: Metadata = {
  title: "BusMate",
  description: "Campus transport platform",
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
