"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Share,
  MoreVertical,
  Download,
  Smartphone,
  Monitor,
  Video,
} from "lucide-react";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

export default function InstallPage() {
  const [platform, setPlatform] = useState<Platform>("desktop");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Installer TGA</h2>
        <p className="text-muted-foreground">
          Installez TGA sur votre appareil pour y acceder rapidement, comme une
          application native.
        </p>
      </div>

      {/* Detected platform highlighted */}
      {platform === "ios" && (
        <p className="text-sm text-muted-foreground">
          Appareil detecte : <strong>iPhone / iPad</strong>
        </p>
      )}
      {platform === "android" && (
        <p className="text-sm text-muted-foreground">
          Appareil detecte : <strong>Android</strong>
        </p>
      )}
      {platform === "desktop" && (
        <p className="text-sm text-muted-foreground">
          Vous naviguez depuis un ordinateur. Les instructions ci-dessous
          concernent l&apos;installation sur mobile.
        </p>
      )}

      {/* iOS Instructions */}
      <Card className={platform === "ios" ? "ring-2 ring-primary" : ""}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-muted-foreground" />
            <div>
              <CardTitle>iPhone / iPad (Safari)</CardTitle>
              <CardDescription>
                Installation via Safari sur iOS
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </span>
              <div>
                <p className="font-medium">Ouvrez Safari</p>
                <p className="text-sm text-muted-foreground">
                  Rendez-vous sur cette page dans le navigateur Safari
                  (l&apos;installation ne fonctionne pas depuis Chrome ou
                  Firefox sur iOS).
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </span>
              <div className="flex items-start gap-2">
                <div>
                  <p className="font-medium">
                    Appuyez sur le bouton Partager
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Le bouton se trouve en bas de l&apos;ecran (icone carree
                    avec une fleche vers le haut).
                  </p>
                </div>
                <Share className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </span>
              <div>
                <p className="font-medium">
                  Selectionnez &laquo; Sur l&apos;ecran d&apos;accueil &raquo;
                </p>
                <p className="text-sm text-muted-foreground">
                  Faites defiler les options vers le bas si necessaire, puis
                  appuyez sur &laquo; Sur l&apos;ecran d&apos;accueil &raquo;.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                4
              </span>
              <div>
                <p className="font-medium">Confirmez l&apos;ajout</p>
                <p className="text-sm text-muted-foreground">
                  Appuyez sur &laquo; Ajouter &raquo; en haut a droite.
                  L&apos;icone TGA apparaitra sur votre ecran d&apos;accueil.
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Android Instructions */}
      <Card className={platform === "android" ? "ring-2 ring-primary" : ""}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-muted-foreground" />
            <div>
              <CardTitle>Android (Chrome)</CardTitle>
              <CardDescription>
                Installation via Chrome sur Android
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                1
              </span>
              <div>
                <p className="font-medium">Ouvrez Chrome</p>
                <p className="text-sm text-muted-foreground">
                  Rendez-vous sur cette page dans le navigateur Google Chrome.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                2
              </span>
              <div className="flex items-start gap-2">
                <div>
                  <p className="font-medium">Appuyez sur les 3 points</p>
                  <p className="text-sm text-muted-foreground">
                    Le menu se trouve en haut a droite de l&apos;ecran.
                  </p>
                </div>
                <MoreVertical className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </span>
              <div className="flex items-start gap-2">
                <div>
                  <p className="font-medium">
                    Selectionnez &laquo; Installer l&apos;application &raquo;
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cette option peut aussi s&apos;appeler &laquo; Ajouter a
                    l&apos;ecran d&apos;accueil &raquo; selon votre version de
                    Chrome.
                  </p>
                </div>
                <Download className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                4
              </span>
              <div>
                <p className="font-medium">Confirmez l&apos;installation</p>
                <p className="text-sm text-muted-foreground">
                  Appuyez sur &laquo; Installer &raquo; dans la boite de
                  dialogue. L&apos;icone TGA apparaitra sur votre ecran
                  d&apos;accueil.
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Desktop note */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Monitor className="h-6 w-6 text-muted-foreground" />
            <div>
              <CardTitle>Ordinateur</CardTitle>
              <CardDescription>
                Installation sur ordinateur (Chrome, Edge)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sur ordinateur, vous pouvez aussi installer TGA. Dans Chrome ou
            Edge, cliquez sur l&apos;icone d&apos;installation dans la barre
            d&apos;adresse (a droite de l&apos;URL), puis confirmez
            l&apos;installation.
          </p>
        </CardContent>
      </Card>

      {/* Video tutorial placeholder */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Video className="h-6 w-6 text-muted-foreground" />
            <div>
              <CardTitle>Tutoriel video</CardTitle>
              <CardDescription>
                Un guide visuel etape par etape
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
            <p className="text-muted-foreground text-sm">
              Video tutoriel a venir
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
