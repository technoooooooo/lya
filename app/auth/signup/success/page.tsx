import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

export default function Page() {
  return (
    <div className="flex min-h-svh">
      <div className="flex flex-1 items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <svg
              className="mb-1"
              width="48"
              height="48"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="14" cy="14" r="13" stroke="hsl(var(--golf))" strokeWidth="1.5" />
              <circle cx="14" cy="14" r="4" fill="hsl(var(--golf))" />
              <path d="M14 10 C14 10, 8 4, 5 7" stroke="hsl(var(--golf))" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
            </svg>
            <h1 className="text-2xl font-semibold tracking-tight">{BRAND_NAME}</h1>
          </div>

          {/* Card */}
          <div className="w-full rounded-2xl border bg-card p-6 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--golf))]/15">
              <Mail className="h-7 w-7 text-[hsl(var(--golf))]" />
            </div>

            <h2 className="text-xl font-semibold tracking-tight">
              Inscription réussie !
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Vérifiez votre boîte email pour confirmer votre compte avant de vous connecter.
            </p>

            {/* Photo de Mathieu */}
            <div className="mt-6 flex flex-col items-center gap-2">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-[hsl(var(--golf))]/30">
                <Image
                  src="/images/mathieu.jpg"
                  alt="Mathieu, votre coach"
                  fill
                  className="object-cover"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Mathieu, votre coach, vous attend !
              </p>
            </div>

            <Link
              href="/auth/login"
              className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[hsl(var(--golf))] px-4 text-sm font-medium text-[hsl(var(--golf-foreground))] transition-colors hover:opacity-90"
            >
              Aller à la page de connexion
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
