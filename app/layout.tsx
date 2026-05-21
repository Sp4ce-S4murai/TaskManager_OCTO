import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OCTO Task Terminal",
  description: "A brutalist terminal task dashboard for a compact team."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
