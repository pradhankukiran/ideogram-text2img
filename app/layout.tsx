import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ideogram text2img",
  description: "Text-to-image interface for the Ideogram Modal API."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
