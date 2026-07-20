// Conventions de pièces jointes du chat : les fichiers uploadés sont
// référencés en markdown à la fin du contenu du message utilisateur — le
// contenu du message reste la seule source de vérité (pas de colonne dédiée).
//   image     : ![nom-du-fichier.jpg](https://…/chat-attachments/…)
//   document  : [📄 nom-du-fichier.pdf](https://…/chat-attachments/…)

export interface ParsedAttachment {
  name: string;
  url: string;
}

export interface ParsedMessageContent {
  text: string;
  images: ParsedAttachment[];
  docs: ParsedAttachment[];
}

export function imageAttachmentMarkdown(name: string, url: string): string {
  return `![${name}](${url})`;
}

export function docAttachmentMarkdown(name: string, url: string): string {
  return `[📄 ${name}](${url})`;
}

/**
 * Sépare le texte d'un message de ses pièces jointes (images et documents).
 * Utilisé pour l'affichage des bulles utilisateur et pour construire les
 * parts multimodales côté serveur.
 */
export function parseAttachments(content: string): ParsedMessageContent {
  const images: ParsedAttachment[] = [];
  const docs: ParsedAttachment[] = [];

  let text = content.replace(
    /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
    (_match, name: string, url: string) => {
      images.push({ name: name || "image", url });
      return "";
    }
  );
  text = text.replace(
    /\[📄 ([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_match, name: string, url: string) => {
      docs.push({ name, url });
      return "";
    }
  );

  return { text: text.replace(/\n{3,}/g, "\n\n").trim(), images, docs };
}

/**
 * Retire les liens/pièces jointes markdown d'un texte — utilisé pour ne pas
 * polluer la requête d'embedding RAG avec des URLs.
 */
export function stripMarkdownLinks(content: string): string {
  return content.replace(/!?\[[^\]]*\]\([^)]*\)/g, " ");
}
