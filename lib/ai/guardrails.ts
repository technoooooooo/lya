// Input sanitization patterns to detect prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above/i,
  /disregard\s+(all\s+)?previous/i,
  /forget\s+(all\s+)?previous/i,
  /you\s+are\s+now/i,
  /new\s+instructions?\s*:/i,
  /system\s*:\s*/i,
  /\[INST\]/i,
  /<<SYS>>/i,
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
  const sanitized = input.trim().slice(0, 4000);

  return { sanitized, flagged };
}

export function validateOutput(output: string): { valid: boolean; reason?: string } {
  // Check for common signs the AI broke out of its persona
  const breakoutPatterns = [
    /as an ai language model/i,
    /i('m| am) (just )?a (large )?language model/i,
    /i don't have personal/i,
    /i was (made|created|trained) by (openai|google|anthropic)/i,
  ];

  for (const pattern of breakoutPatterns) {
    if (pattern.test(output)) {
      return { valid: false, reason: "AI persona breakout detected" };
    }
  }

  return { valid: true };
}
