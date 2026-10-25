import type { Metadata, Viewport } from "next";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SiteFooter, SiteHeader } from "@/components/site";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import "./brand.css";
import "./explorer.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://vaultchain-explorer.vercel.app"),
  title: { default: "VaultChain Explorer: look up files, deals and storage proofs", template: "%s · VaultChain Explorer" },
  description: "Search the VaultChain devnet: find a file, check whether it is safely stored, see who holds it and when its storage runs out. Read-only; no sign-in.",
  openGraph: {
    title: "VaultChain Explorer",
    description: "Look up files, storage deals, providers and proofs on the VaultChain devnet.",
    type: "website",
    siteName: "VaultChain",
  },
  twitter: { card: "summary_large_image", title: "VaultChain Explorer", description: "Look up files, storage deals, providers and proofs on the VaultChain devnet." },
};

export const viewport: Viewport = { themeColor: "#07090d", colorScheme: "dark light" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <OfflineBanner />
        <SiteHeader />
        <main id="main" className="wrap page">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
