/**
 * POLi Payments v2 API integration — NZ bank-transfer gateway.
 *
 * Docs: https://www.polipayments.com/Developer
 *
 * Setup:
 *  1. Sign up at https://www.polipayments.com (merchant account)
 *  2. Merchant login → Integration → Authentication Key
 *  3. Add to .env: POLI_AUTH_CODE, POLI_MERCHANT_CODE, POLI_ENDPOINT
 *
 * Flow: initiate transaction → redirect customer to POLi portal →
 *       customer logs into their NZ bank → returns to your success URL →
 *       fetch transaction to confirm payment.
 */

type PoliInitiate = {
  amount: number; // NZD
  reference: string; // merchant order reference
  returnUrl: string; // success/cancel URL (POLi appends token)
  customerEmail: string;
  customerMobile?: string;
};

type PoliInitiateResult = {
  token: string;
  redirectUrl: string;
  raw?: unknown;
};

export async function initiatePoliPayment(payload: PoliInitiate): Promise<PoliInitiateResult> {
  const authCode = process.env.POLI_AUTH_CODE;
  const merchantCode = process.env.POLI_MERCHANT_CODE;
  const endpoint = process.env.POLI_ENDPOINT || "https://api.polipayments.com/v2";

  if (!authCode || !merchantCode) {
    throw new Error("POLi credentials not configured");
  }

  // POLi uses HTTP Basic auth with merchantCode:authCode
  const auth = Buffer.from(`${merchantCode}:${authCode}`).toString("base64");

  // Initiate transaction
  // https://gist.github.com/polidev/86a3c4e3a5b2d5b8b5b8b5b8b5b8b5b8
  const res = await fetch(`${endpoint}/Transaction/Initiate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      Amount: payload.amount.toFixed(2),
      CurrencyCode: "NZD",
      MerchantReference: payload.reference,
      MerchantHomepageURL: process.env.NEXT_PUBLIC_APP_URL || "https://pocketpizza.co.nz",
      SuccessURL: `${payload.returnUrl}?status=success`,
      FailureURL: `${payload.returnUrl}?status=failure`,
      CancellationURL: `${payload.returnUrl}?status=cancelled`,
      NotificationURL: `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/webhooks/poli`,
      EmailAddress: payload.customerEmail,
      ...(payload.customerMobile ? { MobileNumber: payload.customerMobile } : {}),
      // Customer can pick from any enabled NZ bank
      CheckoutType: "BankTransfer",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POLi initiate HTTP ${res.status}: ${text}`);
  }

  const data = await res.json();

  return {
    token: data.TransactionToken ?? data.token,
    redirectUrl: data.NavigateURL ?? data.redirectUrl,
    raw: data,
  };
}

type PoliTxnResult = {
  token: string;
  status: "COMPLETED" | "PENDING" | "FAILED" | "UNKNOWN";
  amount: number;
  reference: string;
  bank?: string;
  raw?: unknown;
};

export async function getPoliTransaction(token: string): Promise<PoliTxnResult> {
  const authCode = process.env.POLI_AUTH_CODE;
  const merchantCode = process.env.POLI_MERCHANT_CODE;
  const endpoint = process.env.POLI_ENDPOINT || "https://api.polipayments.com/v2";
  if (!authCode || !merchantCode) throw new Error("POLi credentials not configured");

  const auth = Buffer.from(`${merchantCode}:${authCode}`).toString("base64");

  const res = await fetch(`${endpoint}/Transaction/GetTransaction?token=${encodeURIComponent(token)}`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) {
    throw new Error(`POLi get HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();

  const map: Record<string, PoliTxnResult["status"]> = {
    Complete: "COMPLETED",
    Completed: "COMPLETED",
    Pending: "PENDING",
    ReceiptUnverified: "PENDING",
    Failed: "FAILED",
    FailedPayment: "FAILED",
  };

  return {
    token,
    status: map[data.TransactionStatus ?? data.status] ?? "UNKNOWN",
    amount: parseFloat(data.AmountPaid ?? data.Amount ?? "0"),
    reference: data.MerchantReference ?? data.reference ?? "",
    bank: data.BankReference ?? data.Bank,
    raw: data,
  };
}
