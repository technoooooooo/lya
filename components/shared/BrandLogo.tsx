import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";

/**
 * Logo du produit (fichier fourni par le client, carré sur fond vert). Les
 * coins sont arrondis en CSS : le fichier lui-même reste carré pour servir
 * aussi d'icône PWA.
 */
export function BrandLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/logo-tga.png"
      alt={BRAND_NAME}
      width={size}
      height={size}
      className={cn("shrink-0 rounded-lg", className)}
    />
  );
}
