import { MAX_MESSAGE_LENGTH } from "@/lib/validations/chat";

// Détection d'injection de prompt. Volontairement restreinte aux formulations
// non ambiguës : les utilisateurs collent des documents entiers (plans
// d'entraînement Notion, notes de cours) et un motif trop large rejetterait
// des messages légitimes. Le reste est neutralisé par la hiérarchie du prompt
// système, pas par un blocage.
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|messages|prompts)/i,
  /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions|messages|prompts)/i,
  /forget\s+(all\s+)?(previous|your)\s+(instructions|rules)/i,
  // Marqueurs de format de prompt : jamais présents dans un contenu légitime.
  /\[INST\]/i,
  /<<SYS>>/i,
  // Uniquement en début de ligne : un « system : » au milieu d'un document
  // collé est du contenu, pas une instruction.
  /^\s*system\s*:/im,
];

export function sanitizeInput(input: string): { sanitized: string; flagged: boolean } {
  let flagged = false;

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      flagged = true;
      break;
    }
  }

  // Basic sanitization: trim and limit length
  const sanitized = input.trim().slice(0, MAX_MESSAGE_LENGTH);

  return { sanitized, flagged };
}
