import type { Metadata } from "next";
import React from "react";
import Navbar from "../components/layout/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ghostmap — Codebase Intelligence. Visualized.",
  description:
    "Transform any GitHub repository into a living, interactive map — revealing who built what, what's rotting, and where the hidden bombs are.",
  openGraph: {
    title: "Ghostmap",
    description: "Codebase Intelligence. Visualized.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
