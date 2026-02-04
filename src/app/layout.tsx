import "./globals.css";
import type { ReactNode } from "react";
import { Playpen_Sans } from "next/font/google";

const playpenSans = Playpen_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Camembert Chart",
  description: "Draft circle chart tool",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={playpenSans.className}>{children}</body>
    </html>
  );
}

