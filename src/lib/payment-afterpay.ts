/**
 * Afterpay / Clearpay v2 API integration — Buy Now Pay Later (4× interest-free).
 *
 * Docs: https://developers.afterpay.com/afterpay-online/reference
 *
 * Setup:
 *  1. Sign up at https://www.afterpay.com/nz/business
 *  2. Merchant Portal → Settings → API Keys
 *  3. Add to .env: AFTERPAY_MERCHANT_ID, AFTERPAY_SECRET_KEY, AFTERPAY_ENDPOINT
 *
 * NZ endpoint: https://api.afterpay.com/v2  (or use https://api.us.afterpay.com/v2 for US sandbox)
 */

type AfterpayCreateOrder = {
  amount: number; // NZD
  reference: string; // merchant order reference
  consumer: {
    phoneNumber: string;
    givenNames: string;
    surname: string;
    email: string;
  };
  billing?: { postcode: string };
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    price: number; // each, NZD
  }>;
  shippingAmount: number; // NZD
  successUrl: string;
  cancelUrl: string;
};

type AfterpayCreateResult = {
  token: string;
  checkoutUrl: string;
  expiresAt?: string;
  raw?: unknown;
};

export async function createAfterpayOrder(
  payload: AfterpayCreateOrder
): Promise<AfterpayCreateResult> {
  const merchantId = process.env.AFTERPAY_MERCHANT_ID;
  const secret = process.env.AFTERPAY_SECRET_KEY;
  const endpoint = process.env.AFTERPAY_ENDPOINT || "https://api.afterpay.com/v2";

  if (!merchantId || !secret) {
    throw new Error("Afterpay credentials not configured");
  }

  // HTTP Basic auth: merchantId:secretKey
  const auth = Buffer.from(`${merchantId}:${secret}`).toString("base64");

  // Convert total amount → subunits (cents) for the request, but Afterpay v2
  // takes money objects with amount (string) and currency (string)
  const moneyAmount = (n: number) => ({ amount: n.toFixed(2), currency: "NZD" });

  const res = await fetch(`${endpoint}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      "User-Agent": "PocketPizzaNZ/1.0",
    },
    body: JSON.stringify({
      amount: moneyAmount(payload.amount),
      merchantReference: payload.reference,
      consumer: payload.consumer,
      billing: payload.billing,
      items: payload.items.map((it) => ({
        name: it.name,
        sku: it.sku,
        quantity: it.quantity,
        price: moneyAmount(it.price),
      })),
      shippingAmount: moneyAmount(payload.shippingAmount),
      merchant: {
        redirectConfirmUrl: payload.successUrl,
        redirectCancelUrl: payload.cancelUrl,
      },
      // 4 instalment payments are automatic in Afterpay; no extra config needed
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Afterpay create HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();

  return {
    token: data.token,
    // The checkout URL the client redirects to
    checkoutUrl: data.redirectCheckoutUrl,
    expiresAt: data.expires,
    raw: data,
  };
}

type AfterpayCaptureResult = {
  id: string;
  status: "APPROVED" | "DECLINED";
  totalAmount: number;
  raw?: unknown;
};

export async function captureAfterpayPayment(
  token: string
): Promise<AfterpayCaptureResult> {
  const merchantId = process.env.AFTERPAY_MERCHANT_ID;
  const secret = process.env.AFTERPAY_SECRET_KEY;
  const endpoint = process.env.AFTERPAY_ENDPOINT || "https://api.afterpay.com/v2";
  if (!merchantId || !secret) throw new Error("Afterpay credentials not configured");

  const auth = Buffer.from(`${merchantId}:${secret}`).toString("base64");
  const res = await fetch(`${endpoint}/payments/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) {
    throw new Error(`Afterpay capture HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();

  return {
    id: data.id,
    status: data.outcome === "APPROVED" ? "APPROVED" : "DECLINED",
    totalAmount: parseFloat(data.totalAmount?.amount ?? "0"),
    raw: data,
  };
}

// Fetch order details (after customer returns from Afterpay checkout)
export async function getAfterpayOrder(token: string) {
  const merchantId = process.env.AFTERPAY_MERCHANT_ID;
  const secret = process.env.AFTERPAY_SECRET_KEY;
  const endpoint = process.env.AFTERPAY_ENDPOINT || "https://api.afterpay.com/v2";
  if (!merchantId || !secret) throw new Error("Afterpay credentials not configured");

  const auth = Buffer.from(`${merchantId}:${secret}`).toString("base64");
  const res = await fetch(`${endpoint}/orders/${token}`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    throw new Error(`Afterpay get HTTP ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
