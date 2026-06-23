import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PoE2 Build Leveler — endgame build → step-by-step guide",
  description:
    "Paste a Path of Exile 2 Path of Building code and get a full build breakdown plus a Mobalytics-style level-1-to-endgame leveling guide.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
