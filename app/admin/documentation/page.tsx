import {
  BookOpen,
  MessageSquare,
  Shield,
  Wallet,
  Mic,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Repeat,
  Youtube,
  Paperclip,
  SlidersHorizontal,
  MousePointerClick,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Page de documentation à destination du porteur de projet (non technique).
// Explique comment l’IA Lya fonctionne, où ajouter de la connaissance, comment
// la faire évoluer (prompt engineering), et les limites.

function Callout({
  variant = "info",
  children,
}: {
  variant?: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: {
      wrap: "bg-blue-500/10 border-blue-500/30",
      icon: <Lightbulb className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />,
    },
    warning: {
      wrap: "bg-amber-500/10 border-amber-500/30",
      icon: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />,
    },
    success: {
      wrap: "bg-emerald-500/10 border-emerald-500/30",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />,
    },
  }[variant];

  return (
    <div className={`flex gap-3 rounded-lg border p-4 text-sm ${styles.wrap}`}>
      {styles.icon}
      <div className="space-y-1 leading-relaxed">{children}</div>
    </div>
  );
}

export default function DocumentationPage() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-10">
      {/* En-tête */}
      <div>
        <div className="flex items-center gap-2.5 mb-2">
          <BookOpen className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Documentation</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Ce guide explique, en langage simple, comment fonctionne l’assistant IA
          Lya : d’où vient ce qu’il sait, comment enrichir sa connaissance,
          comment faire évoluer son comportement, ce que les élèves peuvent lui
          envoyer, et quelles sont les limites du système. Aucune compétence
          technique n’est nécessaire pour le lire.
        </p>
      </div>

      {/* 1. Vue d'ensemble */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">1. En quelques mots</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Lya n’est pas un chatbot de golf générique. C’est l’extension numérique
          de la pédagogie de Mathieu : l’IA doit répondre{" "}
          <strong className="text-foreground">exactement comme lui</strong>, en
          s’appuyant uniquement sur sa méthode et son savoir. Deux choses la
          rendent fidèle : un{" "}
          <strong className="text-foreground">comportement</strong> bien défini
          (comment elle parle et raisonne) et une{" "}
          <strong className="text-foreground">base de connaissances</strong> (ce
          qu’elle sait). Tout l’enjeu est de mettre chaque information au bon
          endroit.
        </p>
      </section>

      {/* 2. Les sources */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">
          2. Comment l’IA construit ses réponses
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Chaque réponse est assemblée à partir de quatre couches. Bien répartir
          les informations entre elles est ce qui garde l’IA fidèle, rapide et
          économique.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <MessageSquare className="h-5 w-5 text-golf mb-1" />
              <CardTitle className="text-base">1. Le comportement</CardTitle>
              <CardDescription>« Prompt principal »</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              L’identité, le ton, la posture, la méthode de raisonnement, les
              règles absolues.{" "}
              <strong className="text-foreground">Présent à chaque message.</strong>{" "}
              Modifiable dans l’onglet Prompt principal.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <SlidersHorizontal className="h-5 w-5 text-golf mb-1" />
              <CardTitle className="text-base">2. Les règles câblées</CardTitle>
              <CardDescription>Intégrées à l’application</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              Les règles structurelles validées ensemble (construction des plans,
              philosophie de répétition, usage des vidéos…) sont{" "}
              <strong className="text-foreground">
                intégrées au code de l’application
              </strong>{" "}
              pour être appliquées à 100 % des réponses, sans risque d’effacement
              accidentel. Elles évoluent sur demande auprès du développeur.
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <BookOpen className="h-5 w-5 text-golf mb-1" />
              <CardTitle className="text-base">3. Le savoir</CardTitle>
              <CardDescription>« Base de connaissances »</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              Les drills, plans, protocoles, la philosophie, la stratégie de
              parcours, les bibliothèques de vidéos et de photos…{" "}
              <strong className="text-foreground">
                Utilisé seulement quand la question s’y rapporte.
              </strong>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Shield className="h-5 w-5 text-golf mb-1" />
              <CardTitle className="text-base">4. Les garde-fous</CardTitle>
              <CardDescription>« Garde-fous »</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              Les sujets que l’IA doit refuser ou encadrer.{" "}
              <strong className="text-foreground">Présents à chaque message.</strong>
            </CardContent>
          </Card>
        </div>

        <Callout variant="info">
          <p className="font-medium text-foreground">La règle simple pour décider</p>
          <p>
            Posez-vous : « Est-ce que ça doit s’appliquer à <em>chaque</em>{" "}
            réponse ? »
          </p>
          <p>
            • <strong>Oui</strong> → c’est un comportement ou une règle →{" "}
            <strong>Prompt principal</strong> ou <strong>Garde-fous</strong> (ou
            une règle câblée si elle est structurelle).
          </p>
          <p>
            • <strong>Non, seulement sur ce sujet précis</strong> → c’est du
            savoir → <strong>Base de connaissances</strong>.
          </p>
        </Callout>
      </section>

      {/* 3. Base de connaissances / RAG */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">
          3. La base de connaissances — le cœur du savoir
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          C’est ici que doit aller{" "}
          <strong className="text-foreground">
            presque tout le contenu de méthode
          </strong>{" "}
          : exercices, drills, protocoles, plans types, philosophie, stratégie de
          parcours, réponses aux questions fréquentes, contenu des livres,
          bibliothèques de vidéos, etc.
        </p>

        <div className="flex gap-3 rounded-lg border bg-muted/40 p-4">
          <Search className="h-5 w-5 text-golf shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed text-muted-foreground space-y-2">
            <p className="text-foreground font-medium">
              Comment ça marche en coulisses
            </p>
            <p>
              Quand vous ajoutez un document ou un PDF, l’IA le{" "}
              <strong className="text-foreground">
                découpe en petits morceaux
              </strong>{" "}
              et les range automatiquement. À chaque question d’un élève, elle
              recherche les morceaux les plus pertinents et{" "}
              <strong className="text-foreground">ne lit que ceux-là</strong> —
              jamais tout d’un coup. Pour une demande de plan d’entraînement,
              elle va en plus chercher automatiquement la méthode de construction
              des plans et le référentiel des drills, quel que soit le phrasé de
              la question.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Callout variant="success">
            <p>
              On peut ajouter des <strong>livres entiers</strong> sans problème :
              l’IA ne charge que ce qui est utile, donc chaque réponse reste peu
              coûteuse.
            </p>
          </Callout>
          <Callout variant="warning">
            <p>
              L’IA ne « connaît » un contenu que s’il est{" "}
              <strong>retrouvé par la recherche</strong>. D’où l’importance de
              bien titrer et structurer.
            </p>
          </Callout>
        </div>

        <Callout variant="info">
          <p className="font-medium text-foreground">
            Après l’ajout d’un PDF : suivre l’indexation
          </p>
          <p>
            L’analyse d’un gros document (livre) se fait{" "}
            <strong>en arrière-plan</strong> : le fichier apparaît tout de suite,
            avec la mention « Indexation en cours… », puis « X passages indexés »
            une fois terminé. Inutile d’attendre sur la page.
          </p>
          <p>
            ⚠️ Si le PDF est un <strong>scan</strong> (des images de pages, sans
            texte réel), l’interface affiche{" "}
            <strong>« Aucun texte détecté »</strong> : le fichier est bien stocké
            mais l’IA ne peut rien en tirer. Test simple : si vous pouvez
            sélectionner et copier du texte dans le PDF, c’est bon ; sinon, il
            faut d’abord le convertir en PDF texte (OCR).
          </p>
        </Callout>

        <div className="space-y-3">
          <h4 className="font-medium text-sm">
            Bonnes pratiques pour ajouter du savoir
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
            <li>
              <strong className="text-foreground">
                Un document = un thème clair.
              </strong>{" "}
              Plusieurs documents ciblés (« Drills de putting », « Construction
              d’un plan mensuel ») valent mieux qu’un seul document fourre-tout.
            </li>
            <li>
              <strong className="text-foreground">Titre explicite.</strong> Le
              titre aide la recherche. « Drills de putting — dosage et lecture de
              green » est meilleur que « Document 3 ».
            </li>
            <li>
              <strong className="text-foreground">Texte structuré.</strong> Des
              sous-titres, des listes, des étapes numérotées : ça se découpe
              mieux et se retrouve mieux.
            </li>
            <li>
              <strong className="text-foreground">
                La fiche seule ne suffit pas.
              </strong>{" "}
              Une fiche document avec un titre et une description mais{" "}
              <strong className="text-foreground">sans fichier ni contenu</strong>{" "}
              n’apprend rien à l’IA : elle ne connaît que ce qui est réellement
              déposé (badge « 1 fichier » ou texte collé dans la fiche).
            </li>
            <li>
              <strong className="text-foreground">Formats acceptés :</strong>{" "}
              texte collé directement, ou fichiers <strong>PDF / PNG / JPG</strong>{" "}
              (jusqu’à <strong>50 Mo</strong> par fichier).
            </li>
            <li>
              <strong className="text-foreground">
                Pour corriger ou mettre à jour :
              </strong>{" "}
              modifier le document existant (l’IA le range à nouveau
              automatiquement) plutôt que d’en créer un doublon.
            </li>
            <li>
              <strong className="text-foreground">
                Désactiver plutôt que supprimer
              </strong>{" "}
              en cas de doute : un document désactivé n’est plus utilisé mais
              reste récupérable.
            </li>
          </ul>
        </div>

        <Callout variant="warning">
          <p className="font-medium text-foreground">À éviter absolument</p>
          <p>
            Ne pas coller de gros contenus de savoir dans le prompt principal.
            C’était le problème d’origine : un prompt trop lourd coûte cher,
            ralentit, et finit par bloquer l’IA. Le savoir va{" "}
            <strong>toujours</strong> dans la base de connaissances.
          </p>
        </Callout>
      </section>

      {/* 4. Prompt principal & prompt engineering */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">
          4. Le prompt principal — faire évoluer le comportement
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          C’est le <strong className="text-foreground">noyau</strong> : identité,
          posture, ton, principes pédagogiques, modes d’accompagnement, règles
          absolues. Il doit rester{" "}
          <strong className="text-foreground">court et net</strong>. On n’y touche
          que pour un vrai{" "}
          <strong className="text-foreground">changement de comportement</strong>.
        </p>

        <div className="space-y-3">
          <h4 className="font-medium text-sm">
            La méthode pour corriger un comportement (prompt engineering)
          </h4>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Quand une réponse de l’IA ne correspond pas à la méthode, suivre ces
            étapes dans l’ordre donne les meilleurs résultats :
          </p>
          <ol className="space-y-2 text-sm text-muted-foreground leading-relaxed list-decimal pl-5">
            <li>
              <strong className="text-foreground">Constater précisément.</strong>{" "}
              Garder la conversation fautive et identifier <em>ce qui</em> ne va
              pas : le fond (mauvais contenu) ou la forme (mauvaise structure,
              mauvais ton) ?
            </li>
            <li>
              <strong className="text-foreground">Trouver la cause.</strong> Si le
              contenu est faux ou générique → le savoir manque probablement dans
              la base de connaissances (l’ajouter là). Si la structure ou
              l’attitude est fausse → c’est une règle de comportement.
            </li>
            <li>
              <strong className="text-foreground">
                Formuler une règle, pas un exemple.
              </strong>{" "}
              Une bonne règle est à l’impératif, observable, et sans ambiguïté.
              Par exemple : « Tant qu’un travail technique est en cours, les
              drills techniques restent identiques toutes les séances du mois »
              est une bonne règle. « Sois plus cohérent dans les plans » n’en est
              pas une.
            </li>
            <li>
              <strong className="text-foreground">Placer au bon endroit.</strong>{" "}
              Comportement général → Prompt principal. Interdit → Garde-fou.
              Savoir → Base de connaissances. Règle structurelle qui ne doit
              jamais bouger → demander son câblage dans l’application.
            </li>
            <li>
              <strong className="text-foreground">Tester avant de valider.</strong>{" "}
              Rejouer 2-3 questions réelles (dont celle qui posait problème) et
              comparer avec ce que Mathieu aurait répondu. Une modification de
              prompt non testée est une modification hasardeuse.
            </li>
          </ol>
        </div>

        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
          <li>
            <strong className="text-foreground">Rester bref.</strong> Chaque ligne
            ajoutée au prompt principal est « payée » à chaque message. Si c’est
            du savoir, ça ne va pas là.
          </li>
          <li>
            <strong className="text-foreground">
              Une règle claire vaut mieux qu’une page d’exemples.
            </strong>
          </li>
          <li>
            <strong className="text-foreground">Faire relire le résultat.</strong>{" "}
            C’est le cœur de fidélité de la méthode : toute modification doit être
            validée par Mathieu.
          </li>
        </ul>
      </section>

      {/* 5. Plans d'entraînement */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">
          5. Les plans d’entraînement — la philosophie de répétition
        </h3>
        <div className="flex gap-3 rounded-lg border bg-muted/40 p-4">
          <Repeat className="h-5 w-5 text-golf shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed text-muted-foreground space-y-2">
            <p className="text-foreground font-medium">
              Des règles câblées dans l’application
            </p>
            <p>
              La construction des plans est l’usage central de Lya après
              l’académie. Les règles suivantes sont intégrées en dur et
              s’appliquent à chaque plan généré :
            </p>
          </div>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
          <li>
            <strong className="text-foreground">1 à 3 secteurs de travail</strong>{" "}
            maximum définis pour le mois — jamais davantage.
          </li>
          <li>
            <strong className="text-foreground">
              Tant qu’un travail technique est nécessaire
            </strong>{" "}
            : les exercices techniques restent identiques pendant tout le mois
            (l’ancrage vient de la répétition), avec au minimum{" "}
            <strong className="text-foreground">
              deux drills techniques communs
            </strong>{" "}
            à toutes les séances.
          </li>
          <li>
            <strong className="text-foreground">Ce qui varie</strong> d’une séance
            à l’autre : les évaluations, les expérimentations, les pauses, les
            parcours à thème.
          </li>
          <li>
            <strong className="text-foreground">
              Quand le travail technique est terminé
            </strong>{" "}
            : l’IA bascule vers des séances variées avec renouvellement régulier
            des exercices (logique d’entraînement, plus de correction).
          </li>
          <li>
            <strong className="text-foreground">Durée des séances</strong> : si
            elle n’est pas connue, l’IA demande « Combien de temps souhaites-tu
            consacrer à chaque séance ? » avant de produire le plan. Elle ne
            raccourcit ou ne répartit les séances que si le joueur l’a
            explicitement demandé.
          </li>
          <li>
            L’IA reprend la <strong className="text-foreground">structure</strong>{" "}
            des plans de la méthode (ou du plan précédent fourni par l’élève),
            puise les exercices{" "}
            <strong className="text-foreground">
              uniquement dans la base de connaissances
            </strong>
            , et insère les <strong className="text-foreground">liens vidéo</strong>{" "}
            des drills quand ils existent.
          </li>
        </ul>
        <Callout variant="info">
          <p>
            Pour faire évoluer cette philosophie (nouveaux principes, nouvelles
            exceptions), deux leviers : enrichir le document « Méthode de
            construction des plans » dans la base de connaissances pour le fond,
            et demander l’ajustement des règles câblées pour la structure.
          </p>
        </Callout>
      </section>

      {/* 6. Vidéos et photos */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">
          6. Vidéos et photos dans les réponses
        </h3>
        <div className="flex gap-3 rounded-lg border bg-muted/40 p-4">
          <Youtube className="h-5 w-5 text-golf shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed text-muted-foreground space-y-2">
            <p className="text-foreground font-medium">
              Les vidéos : automatique dès que le lien est dans la base
            </p>
            <p>
              Quand un document de la base contient un lien YouTube à côté d’un
              exercice, l’IA insère ce lien quand elle recommande l’exercice —
              et l’application affiche automatiquement une{" "}
              <strong className="text-foreground">vignette cliquable</strong>{" "}
              (miniature + titre de la vidéo) sous la réponse. Rien à configurer.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <h4 className="font-medium text-sm">
            Construire une bibliothèque multimédia (physique, mobilité,
            méditation…)
          </h4>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Le format qui fonctionne est celui du référentiel des drills : un
            document par thème, et pour chaque exercice —{" "}
            <strong className="text-foreground">un titre</strong>,{" "}
            <strong className="text-foreground">l’objectif</strong>,{" "}
            <strong className="text-foreground">les consignes</strong>, et{" "}
            <strong className="text-foreground">le lien de la vidéo</strong>{" "}
            juste en dessous. L’IA récupère alors l’exercice complet, lien
            compris.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Pour les <strong className="text-foreground">photos</strong>{" "}
            (positions, postures, mouvements) : mettre l’adresse publique de
            l’image dans le document, à côté de sa description. Quand l’IA
            recommande l’exercice, la photo s’affiche{" "}
            <strong className="text-foreground">directement dans la réponse</strong>.
          </p>
        </div>
        <Callout variant="warning">
          <p>
            Les liens doivent être <strong>publics ou non répertoriés</strong> :
            une vidéo YouTube privée ou une image protégée par mot de passe ne
            s’afficheront pas chez l’élève.
          </p>
        </Callout>
      </section>

      {/* 7. Garde-fous */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">7. Les garde-fous — les interdits</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ce sont les sujets que l’IA doit refuser ou encadrer, quoi qu’on lui
          demande. Deux types :
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
          <li>
            <strong className="text-foreground">Interdit</strong> — l’IA refuse
            poliment et redirige vers les 5 piliers (ex. sujets hors golf,
            diagnostic médical).
          </li>
          <li>
            <strong className="text-foreground">Exception autorisée</strong> — un
            sujet délicat que l’IA peut aborder dans un cadre défini.
          </li>
        </ul>
        <Callout variant="warning">
          <p>
            Un interdit ne doit <strong>jamais</strong> être mis dans la base de
            connaissances : la recherche ne le retrouverait que si la question lui
            ressemble — donc rarement au bon moment. Un interdit doit être{" "}
            <strong>toujours présent</strong> → c’est un garde-fou.
          </p>
        </Callout>
      </section>

      {/* 8. Ce que les élèves peuvent envoyer */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">
          8. Ce que les élèves peuvent envoyer
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex gap-3 rounded-lg border bg-muted/40 p-4">
            <Mic className="h-5 w-5 text-golf shrink-0 mt-0.5" />
            <div className="text-sm leading-relaxed text-muted-foreground space-y-1">
              <p className="text-foreground font-medium">La voix</p>
              <p>
                L’élève peut dicter au lieu d’écrire. Un indicateur (point rouge +
                chronomètre) montre que l’enregistrement est en cours ; la voix
                est ensuite transcrite en texte et traitée comme un message
                écrit.
              </p>
            </div>
          </div>
          <div className="flex gap-3 rounded-lg border bg-muted/40 p-4">
            <Paperclip className="h-5 w-5 text-golf shrink-0 mt-0.5" />
            <div className="text-sm leading-relaxed text-muted-foreground space-y-1">
              <p className="text-foreground font-medium">Photos et documents</p>
              <p>
                Via le trombone : des <strong className="text-foreground">photos</strong>{" "}
                (carte de score, plan de parcours, posture… — JPG, PNG, WebP, GIF,
                10 Mo max) que l’IA <strong className="text-foreground">regarde
                réellement</strong>, et des{" "}
                <strong className="text-foreground">PDF</strong> (plans
                d’entraînement, notes… — 20 Mo max) dont elle lit le texte, y
                compris pour les questions de suivi.
              </p>
            </div>
          </div>
        </div>
        <Callout variant="warning">
          <p>
            Même limite que pour la base de connaissances : un{" "}
            <strong>PDF scanné</strong> (images de pages) ne peut pas être lu —
            l’élève est prévenu au moment de l’envoi. Les{" "}
            <strong>vidéos d’élèves</strong> (analyse de swing) ne sont pas
            prises en charge pour l’instant : c’est un chantier à part, à cadrer
            avec le garde-fou « analyse technique personnalisée ».
          </p>
        </Callout>
      </section>

      {/* 9. Confort de conversation */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">9. Le confort de conversation</h3>
        <div className="flex gap-3 rounded-lg border bg-muted/40 p-4">
          <MousePointerClick className="h-5 w-5 text-golf shrink-0 mt-0.5" />
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-4">
            <li>
              <strong className="text-foreground">Lire pendant la génération</strong>{" "}
              : si l’élève remonte dans la conversation pendant que l’IA écrit, la
              vue ne redescend plus toute seule. Un bouton « Revenir en bas »
              permet de reprendre le direct.
            </li>
            <li>
              <strong className="text-foreground">Arrêter une réponse</strong> : le
              bouton carré (à la place du bouton d’envoi pendant la génération)
              interrompt immédiatement l’IA. Le début de réponse déjà écrit est
              conservé, et l’élève peut reformuler aussitôt.
            </li>
            <li>
              <strong className="text-foreground">Liens et vidéos</strong> : tous
              les liens s’ouvrent dans un nouvel onglet (la conversation reste
              ouverte), et les vidéos recommandées s’affichent en vignettes
              cliquables sous la réponse.
            </li>
          </ul>
        </div>
      </section>

      {/* 10. Les coûts */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">10. Le suivi des coûts</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          L’IA repose sur un service payant (OpenAI) facturé à l’usage : plus il y
          a de messages et de contenu à traiter, plus le coût monte. L’onglet{" "}
          <strong className="text-foreground">Coûts</strong> (dans Configuration
          IA) affiche les{" "}
          <strong className="text-foreground">montants réels facturés</strong> par
          OpenAI sur les 30 derniers jours : le total, la répartition par modèle,
          et le détail jour par jour.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-3 rounded-lg border bg-muted/40 p-4">
            <Wallet className="h-5 w-5 text-golf shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              C’est la facturation officielle d’OpenAI, pas une estimation. Les
              montants sont affichés en{" "}
              <strong className="text-foreground">dollars US</strong>, la devise
              utilisée par OpenAI.
            </p>
          </div>
          <Callout variant="warning">
            <p>
              Le total est <strong>global</strong> : il n’est pas ventilable par
              élève. Les coûts du jour en cours se consolident au fil de la
              journée.
            </p>
          </Callout>
        </div>
      </section>

      {/* 11. Limites */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">11. Les limites à garder en tête</h3>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
          <li>
            <strong className="text-foreground">
              L’IA ne sait que ce qu’on lui donne.
            </strong>{" "}
            Elle ne va pas chercher d’informations sur internet. Si un contenu
            n’est pas dans la base de connaissances, elle ne le connaît pas.
          </li>
          <li>
            <strong className="text-foreground">
              La qualité des réponses dépend de la qualité du contenu.
            </strong>{" "}
            Un savoir bien titré et structuré donne de meilleures réponses.
          </li>
          <li>
            <strong className="text-foreground">Fidélité = relecture.</strong>{" "}
            Toute modification du comportement (prompt principal) doit être
            validée par Mathieu pour rester fidèle à sa pédagogie.
          </li>
          <li>
            <strong className="text-foreground">Coûts en dollars et globaux.</strong>{" "}
            Le suivi des coûts donne le total facturé, pas un coût par élève.
          </li>
          <li>
            <strong className="text-foreground">Confidentialité.</strong> Les
            conversations et pièces jointes passent par le service d’OpenAI pour
            être traitées ; chaque élève ne voit que ses propres conversations.
          </li>
        </ul>
      </section>

      {/* Résumé */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">En résumé</h3>
        <div className="rounded-lg border bg-muted/40 p-5 text-sm leading-relaxed space-y-2">
          <p>
            <strong className="text-foreground">
              Comportement / règle valable partout
            </strong>{" "}
            → Prompt principal (bref, validé par Mathieu) — ou règle câblée si
            elle est structurelle.
          </p>
          <p>
            <strong className="text-foreground">Savoir sur un sujet précis</strong>{" "}
            → Base de connaissances (autant qu’on veut, bien titré, avec les
            liens vidéo et photos à côté de chaque exercice).
          </p>
          <p>
            <strong className="text-foreground">Sujet à refuser</strong> →
            Garde-fou.
          </p>
          <p className="text-muted-foreground pt-2">
            Le savoir vit dans la base de connaissances, où il peut grandir sans
            limite et sans coût par message. Le prompt reste un noyau court et
            stable. C’est ce qui garde l’IA{" "}
            <strong className="text-foreground">fidèle, rapide et économique</strong>.
          </p>
        </div>
      </section>
    </div>
  );
}
