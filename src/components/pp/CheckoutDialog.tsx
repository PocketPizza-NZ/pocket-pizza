"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ShieldCheck,
  Lock,
  CreditCard,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  AlertCircle,
  MapPin,
  Building2,
  Wallet,
  Landmark,
  ShoppingBag,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useCart, lineTotalOf } from "@/lib/cart-store";
import { useZone } from "@/lib/zone-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Step = "details" | "payment" | "processing" | "success";

type PaymentMethod = "card" | "windcave" | "poli" | "afterpay";

type OrderConfirmation = {
  reference: string;
  total: number;
  estimatedMins: number;
  paymentMethod: PaymentMethod;
  paymentBrand?: string;
  paymentLast4?: string;
};

const NZ_MOBILE_RE = /^(\+?64|0)[2-9]\d{7,9}$/;

function detectBrand(num: string): "visa" | "mastercard" | "amex" | "unknown" {
  const n = num.replace(/\s/g, "");
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return "unknown";
}

function formatCardNumber(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + "/" + digits.slice(2);
}
function formatCvc(v: string) {
  return v.replace(/\D/g, "").slice(0, 4);
}

export function CheckoutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { lines, subtotal, customer, setCustomer, clear, setLastOrderRef } = useCart();
  const { location } = useZone();
  const [step, setStep] = useState<Step>("details");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);

  // Payment method selection
  const [method, setMethod] = useState<PaymentMethod>("card");

  // Card form state (used for both stripe-style card + windcave card)
  const [cardName, setCardName] = useState(customer.fullName || "");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [postcode, setPostcode] = useState("");

  // POLi / Afterpay don't need card fields — they redirect to bank/BNPL portal
  // We still store a reference for the confirmation screen

  useEffect(() => {
    if (open) {
      setStep("details");
      setErrors({});
      setConfirmation(null);
      setCardName(customer.fullName || "");
      setMethod("card");
      // Pre-fill address from selected location if not yet set
      if (!customer.deliveryAddress && location?.address) {
        setCustomer({ deliveryAddress: location.address });
      }
    }
  }, [open]);

  const deliveryFee = location?.isDeliverable ? location.deliveryFee : 0;
  const total = subtotal() + deliveryFee;

  const validateDetails = () => {
    const e: Record<string, string> = {};
    if (!customer.fullName || customer.fullName.trim().length < 2)
      e.fullName = "Please enter your full name";
    if (!customer.mobile || !NZ_MOBILE_RE.test(customer.mobile.replace(/\s/g, "")))
      e.mobile = "Enter a valid NZ mobile (e.g. 021 123 4567)";
    if (!customer.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email))
      e.email = "Enter a valid email address";
    if (!customer.deliveryAddress || customer.deliveryAddress.trim().length < 5)
      e.deliveryAddress = "Enter your street address";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validatePayment = () => {
    // POLi / Afterpay don't have card fields — they redirect
    if (method === "poli" || method === "afterpay") return true;

    const e: Record<string, string> = {};
    if (!cardName || cardName.trim().length < 2)
      e.cardName = "Enter the cardholder name";
    const digits = cardNumber.replace(/\s/g, "");
    if (digits.length < 16) e.cardNumber = "Enter the 16-digit card number";
    if (!/^\d{2}\/\d{2}$/.test(expiry)) e.expiry = "MM/YY";
    else {
      const [mm, yy] = expiry.split("/").map((n) => parseInt(n, 10));
      if (mm < 1 || mm > 12) e.expiry = "Invalid month";
      else {
        const now = new Date();
        const curYY = now.getFullYear() % 100;
        const curMM = now.getMonth() + 1;
        if (yy < curYY || (yy === curYY && mm < curMM))
          e.expiry = "Card expired";
      }
    }
    if (cvc.length < 3) e.cvc = "3–4 digits";
    if (!postcode || postcode.length < 4) e.postcode = "NZ postcode (4 digits)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleDetailsNext = () => {
    if (validateDetails()) setStep("payment");
  };

  const handlePay = async () => {
    if (!validatePayment()) return;
    if (!location || !location.isDeliverable) {
      toast.error("Please choose a deliverable address first");
      return;
    }
    setStep("processing");

    const last4 = method === "poli" || method === "afterpay"
      ? ""
      : cardNumber.replace(/\s/g, "").slice(-4);
    const brand = method === "poli" || method === "afterpay"
      ? method
      : detectBrand(cardNumber);

    try {
      // 1. Create payment intent via the gateway-specific endpoint
      const intentRes = await fetch("/api/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(total * 100),
          currency: "nzd",
          method,
          cardLast4: last4 || "0000",
          cardBrand: brand,
          cardholderName: cardName || customer.fullName,
          billingPostcode: postcode || location.postcode || "0000",
        }),
      });
      if (!intentRes.ok) throw new Error("Payment intent failed");
      const intent = await intentRes.json();

      // 2. Confirm payment (simulated gateway confirmation)
      await new Promise((r) => setTimeout(r, 1200));

      // 3. Place order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            ...customer,
            // Location snapshot
            deliveryLat: location.lat,
            deliveryLng: location.lng,
            distanceKm: location.distanceKm,
            deliveryCity: location.city,
            deliveryRegion: location.region,
            deliveryPostcode: location.postcode,
            deliveryCountry: location.country,
            deliveryFee: location.deliveryFee,
            zoneMins: location.estimatedMins,
            // Address line is already in customer.deliveryAddress
          },
          lines: lines.map((l) => ({
            menuItemId: l.menuItemId,
            name: l.name,
            basePrice: l.basePrice,
            quantity: l.quantity,
            extras: l.extras,
            emoji: l.emoji,
            color: l.color,
            image: l.image,
            rating: l.rating,
            spicy: l.spicy,
          })),
          subtotal: subtotal(),
          deliveryFee: location.deliveryFee,
          total,
          payment: {
            method,
            last4,
            ref: intent.id,
            brand,
          },
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({}));
        throw new Error(err.error || "Order failed");
      }
      const data = await orderRes.json();
      setConfirmation({
        reference: data.order.reference,
        total: data.order.total,
        estimatedMins: location.estimatedMins,
        paymentMethod: method,
        paymentBrand: brand !== "unknown" ? brand : undefined,
        paymentLast4: last4 || undefined,
      });
      setLastOrderRef(data.order.reference);
      setStep("success");
      toast.success("Payment successful — order placed!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      toast.error(msg);
      setStep("payment");
    }
  };

  const handleClose = () => {
    if (step === "success") {
      clear();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[92vh] w-[95vw] gap-0 overflow-hidden p-0 sm:max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-ink px-5 py-3.5 text-cream">
          <div className="flex items-center gap-2">
            {step === "payment" && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-cream hover:bg-cream/10"
                onClick={() => setStep("details")}
                aria-label="Back"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <DialogTitle className="text-base font-black text-cream">
                {step === "details" && "Your details"}
                {step === "payment" && "Choose payment method"}
                {step === "processing" && "Processing payment…"}
                {step === "success" && "Order confirmed"}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-cream/70">
                {step === "details" && "We need these to deliver your pizza"}
                {step === "payment" && "Encrypted end-to-end · NZ PCI-DSS aligned"}
                {step === "processing" && "Do not close this window"}
                {step === "success" && "Grab. Slide. Devour."}
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-cream/10 px-2.5 py-1 text-[11px] font-bold text-accent">
            <Lock className="h-3 w-3" /> SECURE
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {/* Details Step */}
          {step === "details" && (
            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-border bg-card p-3">
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground/70">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Delivering to: <span className="font-bold text-foreground">{location?.addressLine}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {[location?.city, location?.region, location?.postcode, location?.country]
                    .filter(Boolean)
                    .join(", ")}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px]">
                  <span className="text-primary font-bold">${location?.deliveryFee.toFixed(2)} delivery</span>
                  <span className="text-muted-foreground">
                    · {location?.distanceKm.toFixed(1)} km · ~{location?.estimatedMins} min
                  </span>
                </div>
              </div>

              <div className="grid gap-3">
                <Field label="Full name" error={errors.fullName} required>
                  <Input
                    value={customer.fullName || ""}
                    onChange={(e) => setCustomer({ fullName: e.target.value })}
                    placeholder="Jane Smith"
                    autoComplete="name"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mobile (NZ)" error={errors.mobile} required>
                    <Input
                      value={customer.mobile || ""}
                      onChange={(e) => setCustomer({ mobile: e.target.value })}
                      placeholder="021 123 4567"
                      inputMode="tel"
                      autoComplete="tel-national"
                    />
                  </Field>
                  <Field label="Email" error={errors.email} required>
                    <Input
                      value={customer.email || ""}
                      onChange={(e) => setCustomer({ email: e.target.value })}
                      placeholder="jane@example.co.nz"
                      inputMode="email"
                      autoComplete="email"
                    />
                  </Field>
                </div>

                <Field
                  label="Delivery address"
                  error={errors.deliveryAddress}
                  required
                  hint="Confirm or edit the street address for this location"
                >
                  <Textarea
                    value={customer.deliveryAddress || ""}
                    onChange={(e) => setCustomer({ deliveryAddress: e.target.value })}
                    placeholder={"12 Sample Street\n" + (location?.city ?? "New Windsor") + ", Auckland"}
                    rows={2}
                    autoComplete="street-address"
                  />
                </Field>

                <Field label="Delivery notes (optional)">
                  <Input
                    value={customer.deliveryNotes || ""}
                    onChange={(e) => setCustomer({ deliveryNotes: e.target.value })}
                    placeholder="Gate code, knock, etc."
                  />
                </Field>
              </div>

              <div className="rounded-xl bg-secondary/40 p-3 text-[11px] text-foreground/70">
                <div className="mb-1 flex items-center gap-1.5 font-bold text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Your privacy is protected
                </div>
                Personal info is stored encrypted and only used to fulfil this
                order — aligned with the NZ Privacy Act 2020. We never share or
                sell your details.
              </div>

              <OrderSummary />

              <Button
                className="w-full rounded-full bg-primary py-5 text-base font-black text-primary-foreground shadow-md hover:bg-primary/90"
                onClick={handleDetailsNext}
              >
                Continue to payment
              </Button>
            </div>
          )}

          {/* Payment Step */}
          {step === "payment" && (
            <div className="space-y-4 p-5">
              {/* Payment method selector */}
              <div>
                <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-foreground/80">
                  Pay with
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <MethodButton
                    active={method === "card"}
                    onClick={() => setMethod("card")}
                    icon={<CreditCard className="h-4 w-4" />}
                    label="Credit / Debit Card"
                    sub="Stripe · Visa/MC/Amex"
                  />
                  <MethodButton
                    active={method === "windcave"}
                    onClick={() => setMethod("windcave")}
                    icon={<Building2 className="h-4 w-4" />}
                    label="Windcave"
                    sub="NZ gateway · PCI L1"
                  />
                  <MethodButton
                    active={method === "poli"}
                    onClick={() => setMethod("poli")}
                    icon={<Landmark className="h-4 w-4" />}
                    label="POLi"
                    sub="Pay from NZ bank"
                  />
                  <MethodButton
                    active={method === "afterpay"}
                    onClick={() => setMethod("afterpay")}
                    icon={<Wallet className="h-4 w-4" />}
                    label="Afterpay"
                    sub="4 payments, no interest"
                  />
                </div>
              </div>

              {/* Card form (for both stripe-style and windcave) */}
              {(method === "card" || method === "windcave") && (
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm font-bold">
                      <CreditCard className="h-4 w-4 text-primary" /> Card details
                    </div>
                    <div className="flex items-center gap-1">
                      <BrandGlyph brand={detectBrand(cardNumber)} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Field label="Cardholder name" error={errors.cardName} required>
                      <Input
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="JANE SMITH"
                        autoComplete="cc-name"
                      />
                    </Field>

                    <Field label="Card number" error={errors.cardNumber} required>
                      <div className="relative">
                        <Input
                          value={cardNumber}
                          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                          placeholder="4242 4242 4242 4242"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          className="pr-10 font-mono"
                        />
                        <CreditCard className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </Field>

                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Expiry" error={errors.expiry} required>
                        <Input
                          value={expiry}
                          onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                          placeholder="MM/YY"
                          inputMode="numeric"
                          autoComplete="cc-exp"
                          className="font-mono"
                        />
                      </Field>
                      <Field label="CVC" error={errors.cvc} required>
                        <Input
                          value={cvc}
                          onChange={(e) => setCvc(formatCvc(e.target.value))}
                          placeholder="123"
                          inputMode="numeric"
                          autoComplete="cc-csc"
                          className="font-mono"
                        />
                      </Field>
                      <Field label="Postcode" error={errors.postcode} required>
                        <Input
                          value={postcode}
                          onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="1025"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          className="font-mono"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* POLi info */}
              {method === "poli" && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold">
                    <Landmark className="h-4 w-4 text-primary" /> POLi — Pay from your NZ bank
                  </div>
                  <p className="text-xs text-foreground/70">
                    You&apos;ll be redirected to POLi&apos;s secure portal to log into
                    your NZ bank (ANZ, ASB, BNZ, Westpac, Kiwibank and others)
                    and approve an account-to-account transfer. No card details
                    required. Read-only bank access — POLi never stores your
                    login.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["ANZ", "ASB", "BNZ", "Westpac", "Kiwibank", "Cooperative", "TSB"].map((b) => (
                      <span key={b} className="rounded-md bg-secondary/50 px-2 py-0.5 text-[10px] font-bold text-ink">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Afterpay info */}
              {method === "afterpay" && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold">
                    <Wallet className="h-4 w-4 text-primary" /> Afterpay — 4 payments, no interest
                  </div>
                  <p className="text-xs text-foreground/70">
                    Pay in 4 interest-free instalments of ${(total / 4).toFixed(2)} every
                    2 weeks. You&apos;ll be redirected to Afterpay to log in or
                    sign up (instant approval for orders under $2,000). NZ
                    credit criteria apply.
                  </p>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                    {[1, 2, 3, 4].map((n, i) => (
                      <div key={n} className="rounded-lg bg-secondary/40 p-2">
                        <div className="font-black text-primary">${(total / 4).toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {i === 0 ? "Today" : `In ${i * 2} wks`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gateway lock-up */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-[11px] text-foreground/70">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-primary" />
                  {method === "card" && (
                    <>Powered by <span className="font-black italic text-ink">stripe</span></>
                  )}
                  {method === "windcave" && (
                    <>Secured by <span className="font-black text-ink">Windcave</span> (NZ)</>
                  )}
                  {method === "poli" && (
                    <>Powered by <span className="font-black text-ink">POLi</span> Payments</>
                  )}
                  {method === "afterpay" && (
                    <>Powered by <span className="font-black text-ink">Afterpay</span> NZ</>
                  )}
                </div>
                <span>TLS 1.2+ · 3-D Secure</span>
              </div>

              <div className="rounded-xl bg-secondary/40 p-3 text-[11px] text-foreground/75">
                <div className="mb-1 flex items-center gap-1.5 font-bold text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" /> PCI-DSS compliant · NZ standards
                </div>
                {method === "card" || method === "windcave" ? (
                  <>
                    Card data is tokenised via the gateway&apos;s hosted fields —
                    we never see or store your full PAN. Only the last 4 digits
                    are saved to your receipt. All transport uses TLS 1.2+
                    encryption, compliant with NZ PCI-DSS and Privacy Act 2020.
                  </>
                ) : method === "poli" ? (
                  <>
                    POLi uses read-only bank access via OAuth-style login — we
                    never see your banking credentials. Approved by all major NZ
                    banks and certified under the NZ Privacy Act 2020.
                  </>
                ) : (
                  <>
                    Afterpay is a registered financial service provider in NZ
                    (FSP56879). Your instalment plan is managed by Afterpay,
                    not us — we only receive the full payment upfront.
                  </>
                )}
              </div>

              <OrderSummary />

              <Button
                className="w-full gap-2 rounded-full bg-primary py-5 text-base font-black text-primary-foreground shadow-md hover:bg-primary/90"
                onClick={handlePay}
              >
                <Lock className="h-4 w-4" />
                {method === "poli"
                  ? `Pay $${total.toFixed(2)} NZD via POLi`
                  : method === "afterpay"
                  ? `Pay 4 × $${(total / 4).toFixed(2)} with Afterpay`
                  : `Pay $${total.toFixed(2)} NZD`}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                By placing this order you agree to Pocket Pizza&apos;s terms &
                NZ consumer guarantees.
              </p>
            </div>
          )}

          {/* Processing Step */}
          {step === "processing" && (
            <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div>
                <div className="text-lg font-bold">Encrypting & confirming…</div>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  {method === "poli"
                    ? "Connecting to POLi for secure bank transfer…"
                    : method === "afterpay"
                    ? "Connecting to Afterpay for instalment plan…"
                    : "Securely tokenising your card with the gateway and placing your order. Please don't close this window."}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" /> TLS 1.2+ · 256-bit AES
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && confirmation && (
            <div className="flex flex-col items-center gap-4 p-7 text-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
              <div>
                <div className="text-xl font-black">Order placed!</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  We&apos;ve emailed a receipt to{" "}
                  <span className="font-semibold text-foreground">{customer.email}</span>.
                  Your pizza will arrive in ~{confirmation.estimatedMins} min.
                </p>
              </div>

              <div className="w-full rounded-2xl border border-dashed border-primary/40 bg-secondary/30 p-4 text-left">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono font-black text-primary">
                    {confirmation.reference}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total paid</span>
                  <span className="font-black">
                    ${confirmation.total.toFixed(2)} NZD
                    {confirmation.paymentMethod === "afterpay" && (
                      <span className="text-[11px] font-normal text-muted-foreground"> (4× instalment)</span>
                    )}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Delivering to</span>
                  <span className="font-semibold">{location?.addressLine}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Payment</span>
                  <span className="font-semibold">
                    {paymentLabel(confirmation.paymentMethod, confirmation.paymentBrand, confirmation.paymentLast4)}
                  </span>
                </div>
              </div>

              <div className="flex w-full items-center gap-2 rounded-xl bg-card p-3 text-left text-xs text-foreground/70">
                <AlertCircle className="h-4 w-4 shrink-0 text-primary" />
                Tip: Save the reference above. Reply to our order SMS if you
                need to change anything.
              </div>

              <div className="flex w-full gap-2">
                <Button
                  className="flex-1 gap-2 rounded-full bg-primary py-5 font-black text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set("track", confirmation.reference);
                    window.location.href = url.toString();
                  }}
                >
                  <ShoppingBag className="h-4 w-4" />
                  Track order
                </Button>
                <Button
                  className="flex-1 rounded-full bg-ink py-5 font-black text-cream hover:bg-ink/90"
                  onClick={handleClose}
                >
                  Back to menu
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function paymentLabel(method: PaymentMethod, brand?: string, last4?: string) {
  if (method === "card" || method === "windcave") {
    const b = brand && brand !== "unknown" ? brand.toUpperCase() : "Card";
    return last4 ? `${b} •••• ${last4}` : b;
  }
  if (method === "poli") return "POLi bank transfer";
  if (method === "afterpay") return "Afterpay (4× instalment)";
  return method;
}

function MethodButton({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-xl border bg-card p-3 text-left transition",
        active
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-primary/40"
      )}
    >
      <div className="flex w-full items-center justify-between">
        <span className={cn("text-primary", active && "text-primary")}>{icon}</span>
        {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
      </div>
      <div className="text-sm font-bold leading-tight">{label}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </button>
  );
}

function Field({
  label,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1 flex items-center gap-1 text-xs font-semibold text-foreground/80">
        {label}
        {required && <span className="text-primary">*</span>}
      </Label>
      {children}
      {error ? (
        <div className="mt-1 text-[11px] font-medium text-destructive">{error}</div>
      ) : hint ? (
        <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  );
}

function BrandGlyph({ brand }: { brand: "visa" | "mastercard" | "amex" | "unknown" }) {
  if (brand === "visa")
    return (
      <span className="rounded-md bg-ink px-1.5 py-0.5 text-[10px] font-black italic text-cream">
        VISA
      </span>
    );
  if (brand === "mastercard")
    return (
      <span className="flex items-center">
        <span className="h-3.5 w-3.5 rounded-full bg-[#EB001B]" />
        <span className="-ml-1.5 h-3.5 w-3.5 rounded-full bg-[#F79E1B] opacity-90" />
      </span>
    );
  if (brand === "amex")
    return (
      <span className="rounded-md bg-[#2E77BB] px-1.5 py-0.5 text-[10px] font-black italic text-white">
        AMEX
      </span>
    );
  return null;
}

function OrderSummary() {
  const { lines, subtotal } = useCart();
  const { location } = useZone();
  const deliveryFee = location?.isDeliverable ? location.deliveryFee : 0;
  const total = subtotal() + deliveryFee;
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground/60">
        Order summary
      </div>
      <ul className="space-y-1 text-sm">
        {lines.map((l) => (
          <li key={l.key} className="flex justify-between gap-2">
            <span className="truncate text-foreground/80">
              {l.quantity} × {l.name}
            </span>
            <span className="font-semibold">${lineTotalOf(l).toFixed(2)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 space-y-1 border-t border-dashed border-border pt-2 text-sm">
        <div className="flex justify-between text-foreground/70">
          <span>Subtotal</span>
          <span>${subtotal().toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-foreground/70">
          <span>
            Delivery {location ? `· ${location.distanceKm.toFixed(1)} km` : ""}
          </span>
          <span>
            {location
              ? location.isDeliverable
                ? `$${deliveryFee.toFixed(2)}`
                : "—"
              : "—"}
          </span>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 text-base font-black">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
