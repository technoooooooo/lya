import { requireAdmin } from "@/lib/auth/requireAdmin";
import { NextResponse } from "next/server";

// L'API Costs d'OpenAI (/v1/organization/costs) renvoie les coûts reels factures,
// agreges par jour. Elle exige une cle Admin d'organisation (OPENAI_ADMIN_KEY),
// distincte de la cle projet OPENAI_API_KEY utilisee pour les appels chat/embeddings.
// Cf. https://platform.openai.com/settings/organization/admin-keys
const OPENAI_COSTS_URL = "https://api.openai.com/v1/organization/costs";

const PERIOD_DAYS = 30;

interface OpenAICostResult {
  amount: { value: number; currency: string } | null;
  line_item: string | null;
}

interface OpenAICostBucket {
  start_time: number;
  end_time: number;
  results: OpenAICostResult[];
}

export async function GET() {
  try {
    const { response: authResponse } = await requireAdmin();
    if (authResponse) return authResponse;

    const adminKey = process.env.OPENAI_ADMIN_KEY;
    if (!adminKey) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message:
              "Cle Admin OpenAI non configuree. Ajoutez OPENAI_ADMIN_KEY dans vos variables d'environnement.",
            code: "ADMIN_KEY_MISSING",
          },
        },
        { status: 503 }
      );
    }

    const startTime =
      Math.floor(Date.now() / 1000) - PERIOD_DAYS * 24 * 60 * 60;

    const params = new URLSearchParams({
      start_time: String(startTime),
      bucket_width: "1d",
      limit: String(PERIOD_DAYS),
      "group_by[]": "line_item",
    });

    const response = await fetch(`${OPENAI_COSTS_URL}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${adminKey}` },
      // On ne met pas en cache : les coûts se consolident au fil de la journee.
      cache: "no-store",
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          success: false,
          error: {
            message:
              err?.error?.message ||
              `Erreur API OpenAI (${response.status})`,
            code: "OPENAI_COSTS_ERROR",
          },
        },
        { status: 502 }
      );
    }

    const payload = (await response.json()) as { data?: OpenAICostBucket[] };
    const buckets = payload.data ?? [];

    let total = 0;
    let currency = "usd";
    const daily: { date: string; amount: number }[] = [];
    const lineItemTotals = new Map<string, number>();

    for (const bucket of buckets) {
      let dayAmount = 0;
      for (const result of bucket.results) {
        const value = result.amount?.value ?? 0;
        if (result.amount?.currency) currency = result.amount.currency;
        dayAmount += value;
        const name = result.line_item ?? "Autre";
        lineItemTotals.set(name, (lineItemTotals.get(name) ?? 0) + value);
      }
      total += dayAmount;
      daily.push({
        date: new Date(bucket.start_time * 1000).toISOString().split("T")[0],
        amount: dayAmount,
      });
    }

    daily.sort((a, b) => a.date.localeCompare(b.date));

    const byLineItem = Array.from(lineItemTotals.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      success: true,
      data: {
        currency,
        total,
        periodDays: PERIOD_DAYS,
        daily,
        byLineItem,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { message: "Erreur serveur", code: "SERVER_ERROR" },
      },
      { status: 500 }
    );
  }
}
