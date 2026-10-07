import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse embarque des assets (pdfjs) incompatibles avec le bundling
  // serveur : sans cette exclusion, l'extraction de texte PDF échoue
  // silencieusement en production (build standalone).
  // @napi-rs/canvas (binaire natif) fournit DOMMatrix à pdfjs — voir
  // extractPdfText dans lib/ai/indexing.ts.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
