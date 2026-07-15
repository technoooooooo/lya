# Guide — Où mettre quoi dans l'IA de Ton Golf Authentique

Ce guide explique **comment l'IA est nourrie** et **où ajouter un nouvel élément** selon sa nature. Il s'adresse à Mathieu (pour le contenu) et au développeur (pour la mise en œuvre).

---

## Les 3 endroits où vit l'information

L'IA construit chacune de ses réponses à partir de trois sources. Il est essentiel de mettre chaque chose au bon endroit — sinon l'IA devient plus chère, plus lente, et parfois moins fidèle.

| # | Endroit | Contient | Injecté quand ? |
|---|---------|----------|-----------------|
| 1 | **Prompt système** (le « noyau ») | Le **comportement** : identité, posture, ton, méthode de raisonnement, modes d'accompagnement, règles absolues | **À chaque message**, toujours |
| 2 | **Base de connaissances** (documents + fichiers) | Le **savoir** : drills, plans, protocoles, philosophie, stratégie de parcours, contenu des livres… | **Uniquement quand la question s'y rapporte** (recherche automatique) |
| 3 | **Garde-fous** | Les **sujets à refuser** ou à encadrer | **À chaque message**, toujours |

### La règle simple pour décider

> **Est-ce que ça doit s'appliquer à *chaque* réponse ?**
> - **Oui** → c'est du comportement ou une règle → **Prompt système** (1) ou **Garde-fous** (3).
> - **Non, seulement quand on parle de ce sujet précis** → c'est du savoir → **Base de connaissances** (2).

Exemples :
- « L'IA doit toujours tutoyer l'élève » → comportement → **Prompt système**.
- « Voici les 12 drills de putting et leurs protocoles » → savoir → **Base de connaissances**.
- « L'IA ne doit jamais donner de diagnostic médical » → règle de refus → **Garde-fous**.

---

## Comment fonctionne la Base de connaissances (le « RAG »)

Quand on ajoute un document ou un PDF, l'IA le **découpe en petits morceaux** et les **indexe** automatiquement. À chaque question d'un élève, elle recherche les quelques morceaux les plus pertinents et **ne lit que ceux-là**.

Conséquences concrètes :
- ✅ On peut mettre des **livres entiers** sans problème — l'IA ne charge que ce qui est utile.
- ✅ Chaque réponse reste **peu coûteuse** (l'IA ne relit pas tout à chaque fois).
- ⚠️ L'IA ne « connaît » un contenu que s'il est **retrouvé par la recherche**. D'où l'importance de bien titrer et structurer (voir plus bas).

---

## Bonnes pratiques — Ajouter à la Base de connaissances (le savoir)

C'est ici que doit aller **presque tout le contenu de méthode** : exercices, drills, protocoles, plans types, vidéos, philosophie, stratégie de parcours, réponses aux questions fréquentes, etc.

- **Un document = un thème clair.** Mieux vaut plusieurs documents ciblés (« Drills de putting », « Construction d'un plan mensuel ») qu'un seul document fourre-tout.
- **Titre explicite.** Le titre aide la recherche. « Drills de putting — dosage et lecture de green » est meilleur que « Document 3 ».
- **Texte structuré.** Des sous-titres, des listes, des étapes numérotées : ça se découpe mieux et se retrouve mieux.
- **Formats acceptés :** texte collé directement dans un document, ou fichiers **PDF / PNG / JPG** (jusqu'à **50 Mo** par fichier).
- **Écrire comme on explique à un élève.** Le contenu sera lu par l'IA puis reformulé ; un texte clair donne une meilleure reformulation.
- **Pour corriger/mettre à jour :** modifier le document existant (l'IA le ré-indexe automatiquement) plutôt que d'en créer un doublon.
- **Désactiver plutôt que supprimer** si on hésite : un document désactivé n'est plus utilisé mais reste récupérable.

> 🚫 **Ne pas** coller de gros contenus de savoir dans le prompt système. C'était le problème d'origine : un prompt trop lourd coûte cher, ralentit, et finit par bloquer l'IA. Le savoir va **toujours** dans la Base de connaissances.

---

## Bonnes pratiques — Modifier le Prompt système (le comportement)

Le prompt système est le **noyau** : identité, posture, ton, principes pédagogiques, modes d'accompagnement, règles absolues. Il doit rester **court et net** (quelques milliers de mots maximum).

On n'y touche que pour un **changement de comportement**, par exemple :
- une évolution de la posture ou du ton ;
- une nouvelle règle qui doit s'appliquer **partout** ;
- un ajustement des modes d'accompagnement (Académie / Autonome / Visiteur / Hybride) ;
- une règle de priorité dans la charte.

Règles d'or :
- **Rester bref.** Chaque ajout est payé à chaque message. Si c'est du savoir, ça ne va pas ici.
- **Formuler des règles, pas des exemples à rallonge.** Une règle claire (« une seule priorité à la fois ») vaut mieux qu'une page d'exemples.
- **Éviter les répétitions.** Si un principe est déjà écrit, ne pas le redire ailleurs.
- **Faire relire le résultat.** C'est le cœur de fidélité de la méthode : toute modification doit être validée par Mathieu.

---

## Bonnes pratiques — Ajouter un Garde-fou (un interdit)

Les garde-fous sont les **sujets que l'IA doit refuser ou encadrer**. Ils s'appliquent à chaque message, quoi qu'on demande.

Deux types :
- **Interdit** — l'IA refuse poliment et redirige vers les 5 piliers (ex. sujets hors golf, diagnostic médical).
- **Exception autorisée** — un sujet délicat que l'IA peut aborder dans un cadre défini.

Bonnes pratiques :
- **Un garde-fou = un sujet précis**, formulé clairement, avec si besoin une courte explication.
- Réserver les garde-fous aux **vrais interdits** ; les préférences de style vont dans le prompt système.
- ⚠️ **Un interdit ne doit jamais être mis dans la Base de connaissances** : la recherche ne le retrouverait que si la question lui ressemble — donc jamais au bon moment. Un interdit doit être **toujours présent** → c'est un garde-fou.

---

## En résumé

- **Comportement / règle valable partout** → Prompt système (bref, validé par Mathieu).
- **Savoir sur un sujet précis** → Base de connaissances (autant qu'on veut, bien titré).
- **Sujet à refuser** → Garde-fou.

Le savoir vit dans la Base de connaissances, où il peut grandir sans limite et sans coût par message. Le prompt reste un noyau court et stable. C'est ce qui garde l'IA **fidèle, rapide et économique**.
