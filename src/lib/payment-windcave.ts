/**
 * Windcave PXF2 (PXPost) REST API integration — NZ-native PCI-DSS L1 gateway.
 *
 * Docs: https://docs.windcave.com/
 *
 * Setup:
 *  1. Sign up at https://www.windcave.com
 *  2. Settings → API Keys → generate Username + API Key
 *  3. Add to .env: WINDCAVE_USERNAME, WINDCAVE_API_KEY, WINDCAVE_ENDPOINT
 */

type WindcaveCreateTxn = {
  amount: number; // NZD, in major units (e.g. 14.50)
  reference: string; // merchant order reference
  cardholderName: string;
  cardNumber: string; // PAN — handled via tokenisation in production
  cardExpiry: string; // MMYY
  cvc: string;
  billingPostcode: string;
};

type WindcaveResult = {
  id: string;
  authorized: boolean;
  status: "APPROVED" | "DECLINED" | "ERROR";
  card?: { last4: string; brand?: string };
  declineReason?: string;
  raw?: unknown;
};

export async function createWindcavePayment(
  payload: WindcaveCreateTxn
): Promise<WindcaveResult> {
  const username = process.env.WINDCAVE_USERNAME;
  const apiKey = process.env.WINDCAVE_API_KEY;
  const endpoint = process.env.WINDCAVE_ENDPOINT || "https://sec.windcave.com/api/v1";

  if (!username || !apiKey) {
    throw new Error("Windcave credentials not configured");
  }

  // Basic auth (Windcave PXF2 uses HTTP Basic with username:apikey)
  const auth = Buffer.from(`${username}:${apiKey}`).toString("base64");

  // PXF2 transaction creation
  // https://docs.windcave.com/reference/create-transaction
  const res = await fetch(`${endpoint}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      "Accept-Version": "1.0",
    },
    body: JSON.stringify({
      type: "purchase",
      amount: payload.amount.toFixed(2),
      currency: "NZD",
      merchantReference: payload.reference,
      card: {
        cardholderName: payload.cardholderName,
        cardNumber: payload.cardNumber,
        expiry: payload.cardExpiry, // MMYY
        cvc: payload.cvc,
        billing: { postalCode: payload.billingPostcode },
      },
      // 3-D Secure — required for SCA compliance
      enable3DS: true,
      // Store the response code so we can debug declines
      // (Windcave returns a redirect URL for 3DS challenge flow)
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Windcave HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();

  // PXF2 returns the transaction in a hierarchical structure
  const txn = data.transactions?.[0] ?? data;
  const approved = txn.authorized === true || txn.status === "APPROVED";

  return {
    id: txn.id ?? data.id,
    authorized: approved,
    status: approved ? "APPROVED" : txn.status === "DECLINED" ? "DECLINED" : "ERROR",
    card: txn.card
      ? {
          last4: txn.card.last4 ?? payload.cardNumber.slice(-4),
          brand: txn.card.brand,
        }
      : { last4: payload.cardNumber.slice(-4) },
    declineReason: txn.response?.responseText ?? txn.declineReason,
    raw: data,
  };
}

/**
 * Windcave session-based checkout (hosted checkout, no PAN on merchant server).
 * Use this in production — keeps PCI scope to SAQ-A.
 *
 * https://docs.windcave.com/reference/create-session
 */
export async function createWindcaveSession(opts: {
  amount: number;
  reference: string;
  returnUrl: string;
  customerEmail: string;
  customerMobile?: string;
}) {
  const username = process.env.WINDCAVE_USERNAME;
  const apiKey = process.env.WINDCAVE_API_KEY;
  const endpoint = process.env.WINDCAVE_ENDPOINT || "https://sec.windcave.com/api/v1";
  if (!username || !apiKey) throw new Error("Windcave credentials not configured");

  const auth = Buffer.from(`${username}:${apiKey}`).toString("base64");
  const res = await fetch(`${endpoint}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      "Accept-Version": "1.0",
    },
    body: JSON.stringify({
      type: "checkout",
      amount: opts.amount.toFixed(2),
      currency: "NZD",
      merchantReference: opts.reference,
      callbackUrls: {
        approved: `${opts.returnUrl}?status=approved`,
        declined: `${opts.returnUrl}?status=declined`,
        cancelled: `${opts.returnUrl}?status=cancelled`,
      },
      notificationUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/webhooks/windcave`,
      customer: {
        email: opts.customerEmail,
        ...(opts.customerMobile ? { mobile: opts.customerMobile } : {}),
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Windcave session HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    // The HPP URL the client should redirect to
    checkoutUrl: data.links?.find((l: any) => l.rel === "hpp")?.href ?? data.url,
    raw: data,
  };
}
