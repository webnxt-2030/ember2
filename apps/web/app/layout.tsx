import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ember — Milestone Crowdfunding",
  description: "Trust-minimized milestone-based crowdfunding on Morph L2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
