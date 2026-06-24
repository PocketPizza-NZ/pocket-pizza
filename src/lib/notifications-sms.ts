import twilio from "twilio";
import type { Order, Customer } from "@prisma/client";

/**
 * SMS notifications via Twilio.
 *
 * Docs: https://www.twilio.com/docs/sms/api
 *
 * Setup:
 *  1. Sign up at https://www.twilio.com/console
 *  2. Buy an NZ-capable number (e.g. +64XXXXXXXXX)
 *  3. Copy Account SID + Auth Token to .env:
 *       TWILIO_ACCOUNT_SID=ACxxx
 *       TWILIO_AUTH_TOKEN=xxx
 *       TWILIO_FROM_NUMBER=+64XXXXXXXXX
 */

type OrderWithCustomer = Order & { customer: Customer };

function getTwilio(): twilio.Twilio | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !sid.startsWith("AC")) return null;
  return twilio(sid, token);
}

export async function sendOrderConfirmationSms(order: OrderWithCustomer) {
  const client = getTwilio();
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!client || !from) {
    console.log(
      `[sms] Twilio not configured — skipping SMS for order ${order.reference}`
    );
    return { sent: false, reason: "not_configured" };
  }

  // Normalise NZ mobile to E.164 (+64...)
  const digits = order.customer.mobile.replace(/\D/g, "");
  const to =
    digits.startsWith("64")
      ? `+${digits}`
      : digits.startsWith("0")
      ? `+64${digits.slice(1)}`
      : `+64${digits}`;

  const body = `Pocket Pizza NZ: Order ${order.reference} confirmed! $${order.total.toFixed(2)} NZD · Delivering to ${order.deliveryAddress.split(",")[0]} · ~30 min. Save your ref. Reply STOP to opt out.`;

  try {
    const msg = await client.messages.create({
      from,
      to,
      body,
    });
    console.log(`[sms] Sent to ${to} (sid=${msg.sid})`);
    return { sent: true, sid: msg.sid };
  } catch (e: unknown) {
    console.error("[sms] Failed to send:", e);
    return { sent: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

// SMS sent to store admin's phone when a new order arrives
export async function sendAdminNewOrderSms(order: OrderWithCustomer) {
  const client = getTwilio();
  const from = process.env.TWILIO_FROM_NUMBER;
  const adminPhone = process.env.ADMIN_PHONE;
  if (!client || !from || !adminPhone) return { sent: false, reason: "not_configured" };

  const body = `🍕 NEW ORDER ${order.reference} · $${order.total.toFixed(2)} · ${order.customer.fullName} · ${order.customer.mobile} · ${order.deliveryAddress.split(",")[0]}`;

  try {
    const msg = await client.messages.create({ from, to: adminPhone, body });
    return { sent: true, sid: msg.sid };
  } catch (e: unknown) {
    return { sent: false, error: e instanceof Error ? e.message : "unknown" };
  }
}
