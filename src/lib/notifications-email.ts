import { Resend } from "resend";
import type { Order, Customer, OrderItem } from "@prisma/client";

/**
 * Email notifications via Resend.
 *
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 *
 * Setup:
 *  1. Sign up at https://resend.com
 *  2. Verify your sending domain (e.g. pocketpizza.co.nz)
 *  3. Generate an API key
 *  4. Add to .env: RESEND_API_KEY=re_xxx
 *                 RESEND_FROM_EMAIL=orders@pocketpizza.co.nz
 */

type OrderWithRelations = Order & {
  customer: Customer;
  items: OrderItem[];
  zone?: { name: string } | null;
};

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendOrderConfirmationEmail(order: OrderWithRelations) {
  const resend = getResend();
  const fromEmail = process.env.RESEND_FROM_EMAIL || "orders@pocketpizza.co.nz";

  const itemsHtml = order.items
    .map(
      (it) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0e2be;">
          <strong>${it.quantity} × ${it.name}</strong>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #f0e2be;text-align:right;font-weight:600;">
          $${it.lineTotal.toFixed(2)}
        </td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#FFFBEF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <!-- Header -->
      <div style="background:#0A0A0A;border-radius:16px 16px 0 0;padding:24px;color:#FFFBEF;text-align:center;">
        <div style="font-size:24px;font-weight:900;letter-spacing:-0.02em;">POCKET PIZZA NZ</div>
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.18em;color:#FFD300;margin-top:4px;">Halal · Detroit-Sicilian</div>
      </div>

      <!-- Body -->
      <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:32px;border:1px solid #f0e2be;border-top:none;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#E63420;color:#FFFBEF;padding:6px 16px;border-radius:999px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">Order Confirmed</div>
          <h1 style="margin:16px 0 8px;font-size:28px;font-weight:900;color:#0A0A0A;">Grab. Slide. Devour.</h1>
          <p style="margin:0;color:#5C4A2B;font-size:14px;">Your pizza is on its way, ${order.customer.fullName.split(" ")[0]}!</p>
        </div>

        <!-- Order details -->
        <div style="background:#FFFBEF;border-radius:12px;padding:16px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;">
            <span style="color:#5C4A2B;">Reference</span>
            <span style="font-family:monospace;font-weight:900;color:#E63420;">${order.reference}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;">
            <span style="color:#5C4A2B;">Delivering to</span>
            <span style="font-weight:600;color:#0A0A0A;">${order.deliveryAddress.split(",")[0]}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;">
            <span style="color:#5C4A2B;">Payment</span>
            <span style="font-weight:600;color:#0A0A0A;text-transform:capitalize;">
              ${order.paymentMethod}${order.paymentBrand ? ` · ${order.paymentBrand.toUpperCase()}` : ""}${order.paymentLast4 ? ` · •••• ${order.paymentLast4}` : ""}
            </span>
          </div>
        </div>

        <!-- Items -->
        <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#5C4A2B;margin:24px 0 8px;">Your order</h2>
        <table width="100%" style="border-collapse:collapse;font-size:14px;color:#0A0A0A;">
          ${itemsHtml}
        </table>

        <!-- Totals -->
        <div style="margin-top:16px;padding-top:16px;border-top:2px dashed #f0e2be;">
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#5C4A2B;margin-bottom:4px;">
            <span>Subtotal</span><span>$${order.subtotal.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;color:#5C4A2B;margin-bottom:4px;">
            <span>Delivery fee</span><span>$${order.deliveryFee.toFixed(2)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:900;color:#0A0A0A;margin-top:8px;padding-top:8px;border-top:1px solid #f0e2be;">
            <span>Total paid</span><span>$${order.total.toFixed(2)} NZD</span>
          </div>
        </div>

        <!-- Footer note -->
        <div style="margin-top:24px;padding:16px;background:#FFF4D6;border-radius:12px;font-size:12px;color:#5C4A2B;">
          <strong style="color:#0A0A0A;">🎬 Save your reference.</strong> Reply to this email or call us with <code style="background:#FFE361;padding:2px 6px;border-radius:4px;font-weight:700;color:#0A0A0A;">${order.reference}</code> if you need to change anything.
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align:center;padding:24px;color:#5C4A2B;font-size:11px;">
        <p style="margin:0 0 4px;">Pocket Pizza NZ · 210 New Windsor Road, New Windsor, Auckland</p>
        <p style="margin:0 0 4px;">Open Fri 5–9pm · Sat 5–9pm · Sun 2–6pm</p>
        <p style="margin:8px 0 0;color:#A89B7D;">100% Halal · Detroit-Sicilian · Aotearoa New Zealand</p>
      </div>
    </div>
  </body>
</html>`;

  const text = `POCKET PIZZA NZ — Order confirmed

Hi ${order.customer.fullName},

Your order ${order.reference} has been confirmed.

Items:
${order.items.map((it) => `  • ${it.quantity} × ${it.name} — $${it.lineTotal.toFixed(2)}`).join("\n")}

Subtotal:       $${order.subtotal.toFixed(2)}
Delivery fee:   $${order.deliveryFee.toFixed(2)}
Total paid:     $${order.total.toFixed(2)} NZD

Delivering to: ${order.deliveryAddress}
Payment: ${order.paymentMethod}${order.paymentBrand ? ` · ${order.paymentBrand.toUpperCase()}` : ""}${order.paymentLast4 ? ` · •••• ${order.paymentLast4}` : ""}

Save your reference: ${order.reference}

Pocket Pizza NZ
210 New Windsor Road, New Windsor, Auckland
Open Fri 5–9pm · Sat 5–9pm · Sun 2–6pm
`;

  if (!resend) {
    console.log(
      `[email] RESEND_API_KEY not set — skipping email send for order ${order.reference}`
    );
    return { sent: false, reason: "no_api_key" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Pocket Pizza NZ <${fromEmail}>`,
      to: [order.customer.email],
      subject: `Order confirmed · ${order.reference} · Pocket Pizza NZ`,
      html,
      text,
      replyTo: fromEmail,
      tags: [
        { name: "type", value: "order_confirmation" },
        { name: "reference", value: order.reference },
      ],
    });
    if (error) {
      console.error("[email] Resend error:", error);
      return { sent: false, error: error.message };
    }
    console.log(`[email] Sent confirmation to ${order.customer.email} (id=${data?.id})`);
    return { sent: true, id: data?.id };
  } catch (e: unknown) {
    console.error("[email] Failed to send:", e);
    return { sent: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

// Email sent to store admin when a new order arrives
export async function sendAdminNewOrderEmail(order: OrderWithRelations) {
  const resend = getResend();
  const fromEmail = process.env.RESEND_FROM_EMAIL || "orders@pocketpizza.co.nz";
  const adminEmail = process.env.ADMIN_EMAIL || fromEmail;

  if (!resend) {
    console.log(
      `[email] RESEND_API_KEY not set — skipping admin alert email for order ${order.reference}`
    );
    return { sent: false, reason: "no_api_key" };
  }

  const itemsList = order.items
    .map((it) => `${it.quantity} × ${it.name} — $${it.lineTotal.toFixed(2)}`)
    .join("\n");

  // High-impact HTML email — designed to be noticeable in the inbox
  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#FFFBEF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <div style="background:#E63420;border-radius:16px 16px 0 0;padding:24px;color:#FFFBEF;text-align:center;">
        <div style="font-size:36px;line-height:1;">🔔</div>
        <div style="font-size:22px;font-weight:900;margin-top:8px;">NEW ORDER</div>
        <div style="font-size:12px;opacity:0.85;margin-top:4px;">Pocket Pizza NZ · ${new Date(order.createdAt).toLocaleString("en-NZ", { dateStyle: "medium", timeStyle: "short" })}</div>
      </div>
      <div style="background:#ffffff;border:1px solid #f0e2be;border-top:none;border-radius:0 0 16px 16px;padding:24px;">
        <h1 style="margin:0 0 16px;font-size:24px;color:#0A0A0A;">Order ${order.reference} · $${order.total.toFixed(2)} NZD</h1>

        <table width="100%" style="border-collapse:collapse;font-size:14px;color:#0A0A0A;margin-bottom:16px;">
          <tr>
            <td style="padding:6px 0;color:#5C4A2B;width:30%;"><strong>Customer</strong></td>
            <td style="padding:6px 0;">${order.customer.fullName}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#5C4A2B;"><strong>Mobile</strong></td>
            <td style="padding:6px 0;"><a href="tel:${order.customer.mobile}" style="color:#0A0A0A;">${order.customer.mobile}</a></td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#5C4A2B;"><strong>Email</strong></td>
            <td style="padding:6px 0;"><a href="mailto:${order.customer.email}" style="color:#0A0A0A;">${order.customer.email}</a></td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#5C4A2B;vertical-align:top;"><strong>Deliver to</strong></td>
            <td style="padding:6px 0;">${order.deliveryAddress}${order.distanceKm ? `<br><span style="color:#5C4A2B;font-size:12px;">${order.distanceKm.toFixed(1)} km away</span>` : ""}</td>
          </tr>
          ${order.deliveryNotes ? `<tr><td style="padding:6px 0;color:#5C4A2B;vertical-align:top;"><strong>Notes</strong></td><td style="padding:6px 0;">${order.deliveryNotes}</td></tr>` : ""}
        </table>

        <h2 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#5C4A2B;margin:16px 0 8px;border-top:1px solid #f0e2be;padding-top:16px;">Items</h2>
        <pre style="background:#FFFBEF;padding:12px;border-radius:8px;font-family:monospace;font-size:13px;margin:0 0 16px;white-space:pre-wrap;">${itemsList}</pre>

        <table width="100%" style="border-collapse:collapse;font-size:14px;color:#0A0A0A;margin-bottom:16px;">
          <tr><td style="padding:4px 0;color:#5C4A2B;">Subtotal</td><td style="padding:4px 0;text-align:right;">$${order.subtotal.toFixed(2)}</td></tr>
          <tr><td style="padding:4px 0;color:#5C4A2B;">Delivery</td><td style="padding:4px 0;text-align:right;">$${order.deliveryFee.toFixed(2)}</td></tr>
          <tr><td style="padding:8px 0;font-weight:900;border-top:2px solid #f0e2be;font-size:18px;">Total</td><td style="padding:8px 0;text-align:right;font-weight:900;border-top:2px solid #f0e2be;font-size:18px;">$${order.total.toFixed(2)}</td></tr>
        </table>

        <div style="background:#FFF4D6;border-radius:8px;padding:12px;font-size:13px;color:#0A0A0A;margin-bottom:16px;">
          <strong>Payment:</strong> ${order.paymentMethod}${order.paymentBrand ? ` · ${order.paymentBrand.toUpperCase()}` : ""}${order.paymentLast4 ? ` · •••• ${order.paymentLast4}` : ""}
        </div>

        <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://pocketpizza.co.nz"}/?admin=1" style="display:inline-block;background:#0A0A0A;color:#FFFBEF;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:700;">Manage in dashboard →</a>
      </div>
    </div>
  </body>
</html>`;

  const text = `🔔 NEW ORDER — ${order.reference}

Customer: ${order.customer.fullName}
Mobile: ${order.customer.mobile}
Email: ${order.customer.email}

Deliver to: ${order.deliveryAddress}
${order.distanceKm ? `Distance: ${order.distanceKm.toFixed(1)} km away` : ""}
${order.deliveryNotes ? `Notes: ${order.deliveryNotes}` : ""}

Items:
${itemsList}

Subtotal: $${order.subtotal.toFixed(2)}
Delivery: $${order.deliveryFee.toFixed(2)}
TOTAL: $${order.total.toFixed(2)} NZD

Payment: ${order.paymentMethod}${order.paymentBrand ? ` · ${order.paymentBrand.toUpperCase()}` : ""}${order.paymentLast4 ? ` · •••• ${order.paymentLast4}` : ""}

Manage in dashboard: ${process.env.NEXT_PUBLIC_APP_URL || "https://pocketpizza.co.nz"}/?admin=1
`;

  try {
    const { data, error } = await resend.emails.send({
      from: `Pocket Pizza NZ <${fromEmail}>`,
      to: [adminEmail],
      subject: `🔔 NEW ORDER ${order.reference} · $${order.total.toFixed(2)} NZD · ${order.customer.fullName}`,
      html,
      text,
      replyTo: `${order.customer.fullName} <${order.customer.email}>`,
      // Priority headers so it shows up at the top of inbox
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        Importance: "high",
      },
      tags: [
        { name: "type", value: "admin_new_order" },
        { name: "reference", value: order.reference },
      ],
    });
    if (error) {
      console.error("[email] Admin alert send failed:", error);
      return { sent: false, error: error.message };
    }
    console.log(
      `[email] ✓ Admin alert sent to ${adminEmail} for order ${order.reference} (id=${data?.id})`
    );
    return { sent: true, id: data?.id };
  } catch (e: unknown) {
    console.error("[email] Admin alert exception:", e);
    return { sent: false, error: e instanceof Error ? e.message : "unknown" };
  }
}
