import { createHmac, timingSafeEqual } from "crypto";

const TIMESTAMP_TOLERANCE_SECONDS = 300; // 5 minutes

/**
 * Parse the Stripe-Signature header into its components.
 * Format: t=timestamp,v1=signature
 */
function parseSignatureHeader(header: string): { timestamp: number; signatures: string[] } {
  const parts = header.split(",");
  let timestamp = 0;
  const signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key === "t") {
      timestamp = parseInt(value, 10);
    } else if (key === "v1") {
      signatures.push(value);
    }
  }

  return { timestamp, signatures };
}

/**
 * Verify a Stripe webhook signature using Node.js crypto.
 *
 * @param payload - The raw request body as a string
 * @param signatureHeader - The value of the Stripe-Signature header
 * @param secret - The webhook endpoint secret (whsec_...)
 * @returns true if the signature is valid, false otherwise
 */
export function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string
): boolean {
  try {
    const { timestamp, signatures } = parseSignatureHeader(signatureHeader);

    // Check that we got a timestamp and at least one signature
    if (!timestamp || signatures.length === 0) {
      return false;
    }

    // Check timestamp tolerance to prevent replay attacks
    const currentTime = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTime - timestamp) > TIMESTAMP_TOLERANCE_SECONDS) {
      return false;
    }

    // Compute expected signature: HMAC-SHA256 of "timestamp.payload"
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = createHmac("sha256", secret)
      .update(signedPayload, "utf8")
      .digest("hex");

    // Check if any of the provided v1 signatures match using timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    for (const signature of signatures) {
      const signatureBuffer = Buffer.from(signature, "utf8");

      if (
        expectedBuffer.length === signatureBuffer.length &&
        timingSafeEqual(expectedBuffer, signatureBuffer)
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}
