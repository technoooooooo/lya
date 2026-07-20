import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse embarque des assets (pdfjs) incompatibles avec le bundling
  // serveur : sans cette exclusion, l'extraction de texte PDF échoue
  // silencieusement en production (build standalone).
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
