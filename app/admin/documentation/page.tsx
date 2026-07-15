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
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Page de documentation à destination du porteur de projet (non technique).
// Explique comment l'IA Lya fonctionne, où ajouter de la connaissance, et les limites.

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
          Ce guide explique, en langage simple, comment fonctionne l&apos;assistant
          IA Lya : d&apos;où vient ce qu&apos;il sait, comment enrichir sa
          connaissance, comment sont suivis les coûts, et quelles sont les limites
          du système. Aucune compétence technique n&apos;est nécessaire pour le lire.
        </p>
      </div>

      {/* 1. Vue d'ensemble */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">1. En quelques mots</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Lya n&apos;est pas un chatbot de golf générique. C&apos;est
          l&apos;extension numérique de la pédagogie de Mathieu : l&apos;IA doit
          répondre <strong className="text-foreground">exactement comme lui</strong>,
          en s&apos;appuyant uniquement sur sa méthode et son savoir. Deux choses la
          rendent fidèle : un <strong className="text-foreground">comportement</strong> bien
          défini (comment elle parle et raisonne) et une{" "}
          <strong className="text-foreground">base de connaissances</strong> (ce
          qu&apos;elle sait). Tout l&apos;enjeu est de mettre chaque information au
          bon endroit.
        </p>
      </section>

      {/* 2. Les 3 sources */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">
          2. Comment l&apos;IA construit ses réponses
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Chaque réponse est assemblée à partir de trois sources. Bien répartir les
          informations entre elles est ce qui garde l&apos;IA fidèle, rapide et
          économique.
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <MessageSquare className="h-5 w-5 text-golf mb-1" />
              <CardTitle className="text-base">1. Le comportement</CardTitle>
              <CardDescription>« Prompt principal »</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              L&apos;identité, le ton, la posture, la méthode de raisonnement, les
              règles absolues.{" "}
              <strong className="text-foreground">Présent à chaque message.</strong>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <BookOpen className="h-5 w-5 text-golf mb-1" />
              <CardTitle className="text-base">2. Le savoir</CardTitle>
              <CardDescription>« Base de connaissances »</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              Les drills, plans, protocoles, la philosophie, la stratégie de
              parcours, le contenu des livres…{" "}
              <strong className="text-foreground">
                Utilisé seulement quand la question s&apos;y rapporte.
              </strong>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <Shield className="h-5 w-5 text-golf mb-1" />
              <CardTitle className="text-base">3. Les garde-fous</CardTitle>
              <CardDescription>« Garde-fous »</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              Les sujets que l&apos;IA doit refuser ou encadrer.{" "}
              <strong className="text-foreground">Présents à chaque message.</strong>
            </CardContent>
          </Card>
        </div>

        <Callout variant="info">
          <p className="font-medium text-foreground">La règle simple pour décider</p>
          <p>
            Posez-vous : « Est-ce que ça doit s&apos;appliquer à{" "}
            <em>chaque</em> réponse ? »
          </p>
          <p>
            • <strong>Oui</strong> → c&apos;est un comportement ou une règle →{" "}
            <strong>Prompt principal</strong> ou <strong>Garde-fous</strong>.
          </p>
          <p>
            • <strong>Non, seulement sur ce sujet précis</strong> → c&apos;est du
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
          C&apos;est ici que doit aller{" "}
          <strong className="text-foreground">presque tout le contenu de méthode</strong>{" "}
          : exercices, drills, protocoles, plans types, philosophie, stratégie de
          parcours, réponses aux questions fréquentes, contenu des livres, etc.
        </p>

        <div className="flex gap-3 rounded-lg border bg-muted/40 p-4">
          <Search className="h-5 w-5 text-golf shrink-0 mt-0.5" />
          <div className="text-sm leading-relaxed text-muted-foreground space-y-2">
            <p className="text-foreground font-medium">
              Comment ça marche en coulisses
            </p>
            <p>
              Quand vous ajoutez un document ou un PDF, l&apos;IA le{" "}
              <strong className="text-foreground">découpe en petits morceaux</strong>{" "}
              et les range automatiquement. À chaque question d&apos;un élève, elle
              recherche les quelques morceaux les plus pertinents et{" "}
              <strong className="text-foreground">ne lit que ceux-là</strong> — jamais
              tout d&apos;un coup.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Callout variant="success">
            <p>
              On peut ajouter des <strong>livres entiers</strong> sans problème :
              l&apos;IA ne charge que ce qui est utile, donc chaque réponse reste peu
              coûteuse.
            </p>
          </Callout>
          <Callout variant="warning">
            <p>
              L&apos;IA ne « connaît » un contenu que s&apos;il est{" "}
              <strong>retrouvé par la recherche</strong>. D&apos;où l&apos;importance
              de bien titrer et structurer.
            </p>
          </Callout>
        </div>

        <Callout variant="info">
          <p className="font-medium text-foreground">
            Après l&apos;ajout d&apos;un PDF : suivre l&apos;indexation
          </p>
          <p>
            L&apos;analyse d&apos;un gros document (livre) se fait{" "}
            <strong>en arrière-plan</strong> : le fichier apparaît tout de suite,
            avec la mention « Indexation en cours… », puis « X passages indexés »
            une fois terminé. Inutile d&apos;attendre sur la page.
          </p>
          <p>
            ⚠️ Si le PDF est un <strong>scan</strong> (des images de pages, sans
            texte réel), l&apos;interface affiche{" "}
            <strong>« Aucun texte détecté »</strong> : le fichier est bien stocké
            mais l&apos;IA ne peut rien en tirer. Test simple : si vous pouvez
            sélectionner et copier du texte dans le PDF, c&apos;est bon ; sinon,
            il faut d&apos;abord le convertir en PDF texte (OCR).
          </p>
        </Callout>

        <div className="space-y-3">
          <h4 className="font-medium text-sm">
            Bonnes pratiques pour ajouter du savoir
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
            <li>
              <strong className="text-foreground">Un document = un thème clair.</strong>{" "}
              Plusieurs documents ciblés (« Drills de putting », « Construction
              d&apos;un plan mensuel ») valent mieux qu&apos;un seul document
              fourre-tout.
            </li>
            <li>
              <strong className="text-foreground">Titre explicite.</strong> Le titre
              aide la recherche. « Drills de putting — dosage et lecture de green »
              est meilleur que « Document 3 ».
            </li>
            <li>
              <strong className="text-foreground">Texte structuré.</strong> Des
              sous-titres, des listes, des étapes numérotées : ça se découpe mieux et
              se retrouve mieux.
            </li>
            <li>
              <strong className="text-foreground">Formats acceptés :</strong> texte
              collé directement, ou fichiers <strong>PDF / PNG / JPG</strong> (jusqu&apos;à{" "}
              <strong>50 Mo</strong> par fichier).
            </li>
            <li>
              <strong className="text-foreground">Pour corriger ou mettre à jour :</strong>{" "}
              modifier le document existant (l&apos;IA le range à nouveau
              automatiquement) plutôt que d&apos;en créer un doublon.
            </li>
            <li>
              <strong className="text-foreground">Désactiver plutôt que supprimer</strong>{" "}
              en cas de doute : un document désactivé n&apos;est plus utilisé mais
              reste récupérable.
            </li>
          </ul>
        </div>

        <Callout variant="warning">
          <p className="font-medium text-foreground">À éviter absolument</p>
          <p>
            Ne pas coller de gros contenus de savoir dans le prompt principal.
            C&apos;était le problème d&apos;origine : un prompt trop lourd coûte cher,
            ralentit, et finit par bloquer l&apos;IA. Le savoir va{" "}
            <strong>toujours</strong> dans la base de connaissances.
          </p>
        </Callout>
      </section>

      {/* 4. Prompt principal */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">
          4. Le prompt principal — le comportement
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          C&apos;est le <strong className="text-foreground">noyau</strong> : identité,
          posture, ton, principes pédagogiques, modes d&apos;accompagnement, règles
          absolues. Il doit rester <strong className="text-foreground">court et net</strong>.
          On n&apos;y touche que pour un vrai{" "}
          <strong className="text-foreground">changement de comportement</strong> (une
          évolution de posture, une nouvelle règle valable partout, un ajustement des
          modes d&apos;accompagnement).
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
          <li>
            <strong className="text-foreground">Rester bref.</strong> Chaque ligne
            ajoutée ici est « payée » à chaque message. Si c&apos;est du savoir, ça ne
            va pas là.
          </li>
          <li>
            <strong className="text-foreground">Des règles, pas des exemples à rallonge.</strong>{" "}
            Une règle claire vaut mieux qu&apos;une page d&apos;exemples.
          </li>
          <li>
            <strong className="text-foreground">Faire relire le résultat.</strong>{" "}
            C&apos;est le cœur de fidélité de la méthode : toute modification doit être
            validée par Mathieu.
          </li>
        </ul>
      </section>

      {/* 5. Garde-fous */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">5. Les garde-fous — les interdits</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ce sont les sujets que l&apos;IA doit refuser ou encadrer, quoi qu&apos;on
          lui demande. Deux types :
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
          <li>
            <strong className="text-foreground">Interdit</strong> — l&apos;IA refuse
            poliment et redirige vers les 5 piliers (ex. sujets hors golf, diagnostic
            médical).
          </li>
          <li>
            <strong className="text-foreground">Exception autorisée</strong> — un
            sujet délicat que l&apos;IA peut aborder dans un cadre défini.
          </li>
        </ul>
        <Callout variant="warning">
          <p>
            Un interdit ne doit <strong>jamais</strong> être mis dans la base de
            connaissances : la recherche ne le retrouverait que si la question lui
            ressemble — donc rarement au bon moment. Un interdit doit être{" "}
            <strong>toujours présent</strong> → c&apos;est un garde-fou.
          </p>
        </Callout>
      </section>

      {/* 6. La voix */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">6. Les messages vocaux</h3>
        <div className="flex gap-3 rounded-lg border bg-muted/40 p-4">
          <Mic className="h-5 w-5 text-golf shrink-0 mt-0.5" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            L&apos;élève peut parler au lieu d&apos;écrire. Sa voix est transcrite
            automatiquement en texte (en français), puis traitée exactement comme un
            message écrit. Rien de particulier à configurer côté contenu.
          </p>
        </div>
      </section>

      {/* 7. Les coûts */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">7. Le suivi des coûts</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          L&apos;IA repose sur un service payant (OpenAI) facturé à l&apos;usage :
          plus il y a de messages et de contenu à traiter, plus le coût monte.
          L&apos;onglet <strong className="text-foreground">Coûts</strong> (dans
          Configuration IA) affiche les{" "}
          <strong className="text-foreground">montants réels facturés</strong> par
          OpenAI sur les 30 derniers jours : le total, la répartition par modèle, et
          le détail jour par jour.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-3 rounded-lg border bg-muted/40 p-4">
            <Wallet className="h-5 w-5 text-golf shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              C&apos;est la facturation officielle d&apos;OpenAI, pas une estimation.
              Les montants sont affichés en{" "}
              <strong className="text-foreground">dollars US</strong>, la devise
              utilisée par OpenAI.
            </p>
          </div>
          <Callout variant="warning">
            <p>
              Le total est <strong>global</strong> : il n&apos;est pas ventilable par
              élève. Les coûts du jour en cours se consolident au fil de la journée.
            </p>
          </Callout>
        </div>
      </section>

      {/* 8. Limites */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">8. Les limites à garder en tête</h3>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
          <li>
            <strong className="text-foreground">L&apos;IA ne sait que ce qu&apos;on lui donne.</strong>{" "}
            Elle ne va pas chercher d&apos;informations sur internet. Si un contenu
            n&apos;est pas dans la base de connaissances, elle ne le connaît pas.
          </li>
          <li>
            <strong className="text-foreground">La qualité des réponses dépend de la qualité du contenu.</strong>{" "}
            Un savoir bien titré et structuré donne de meilleures réponses.
          </li>
          <li>
            <strong className="text-foreground">Fidélité = relecture.</strong> Toute
            modification du comportement (prompt principal) doit être validée par
            Mathieu pour rester fidèle à sa pédagogie.
          </li>
          <li>
            <strong className="text-foreground">Coûts en dollars et globaux.</strong>{" "}
            Le suivi des coûts donne le total facturé, pas un coût par élève.
          </li>
          <li>
            <strong className="text-foreground">Confidentialité.</strong> Les
            conversations passent par le service d&apos;OpenAI pour être traitées ;
            chaque élève ne voit que ses propres conversations.
          </li>
        </ul>
      </section>

      {/* Résumé */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">En résumé</h3>
        <div className="rounded-lg border bg-muted/40 p-5 text-sm leading-relaxed space-y-2">
          <p>
            <strong className="text-foreground">Comportement / règle valable partout</strong>{" "}
            → Prompt principal (bref, validé par Mathieu).
          </p>
          <p>
            <strong className="text-foreground">Savoir sur un sujet précis</strong> →
            Base de connaissances (autant qu&apos;on veut, bien titré).
          </p>
          <p>
            <strong className="text-foreground">Sujet à refuser</strong> → Garde-fou.
          </p>
          <p className="text-muted-foreground pt-2">
            Le savoir vit dans la base de connaissances, où il peut grandir sans limite
            et sans coût par message. Le prompt reste un noyau court et stable.
            C&apos;est ce qui garde l&apos;IA{" "}
            <strong className="text-foreground">fidèle, rapide et économique</strong>.
          </p>
        </div>
      </section>
    </div>
  );
}
