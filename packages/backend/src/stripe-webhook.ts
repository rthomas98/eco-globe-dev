import Stripe from "stripe";

export class StripeWebhookError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Authenticate the untouched body before any database or provider operation. */
export function verifyStripeWebhook(
  payload: string,
  signature: string | undefined,
  secret: string | undefined,
): Stripe.Event {
  if (!secret?.trim()) {
    throw new StripeWebhookError(503, "Stripe webhook is not configured.");
  }
  if (!signature) {
    throw new StripeWebhookError(400, "Missing Stripe-Signature header.");
  }
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(payload, signature, secret, 300);
  } catch {
    throw new StripeWebhookError(
      400,
      "Stripe webhook signature verification failed.",
    );
  }
  if (
    !event ||
    typeof event.id !== "string" ||
    !event.id.startsWith("evt_") ||
    typeof event.type !== "string" ||
    typeof event.livemode !== "boolean" ||
    !event.data ||
    typeof event.data.object !== "object" ||
    !event.data.object
  ) {
    throw new StripeWebhookError(400, "Invalid Stripe event.");
  }
  return event;
}
