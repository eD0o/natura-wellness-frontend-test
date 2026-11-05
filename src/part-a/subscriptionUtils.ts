import type { Subscription } from "../api/types";

export type RetentionReason = "tooMuch" | "cost" | "different" | "results" | "other";
export type RetentionStep = "reason" | "offer";

export const retentionReasons: Array<{ id: RetentionReason; label: string }> = [
  { id: "tooMuch", label: "I have too much product left" },
  { id: "cost", label: "It costs too much" },
  { id: "different", label: "I’m trying a different product" },
  { id: "results", label: "I didn’t see results" },
  { id: "other", label: "Other" },
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const longDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});
const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

export const money = (cents: number) => currencyFormatter.format(cents / 100);
export const date = (value: string) => longDateFormatter.format(new Date(value));
export const shortDate = (value: string) => shortDateFormatter.format(new Date(value));
export const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

export function getStatusCopy(subscription: Subscription) {
  if (subscription.status === "active") {
    return {
      label: "Active",
      detail: "You’re saving " + subscription.discountPercent + "% on every delivery.",
    };
  }

  if (subscription.status === "paused") {
    return {
      label: "Paused",
      detail: "Your pause ends " + date(subscription.pausedUntil!) + ".",
    };
  }

  return {
    label: "Cancelled",
    detail: "Cancelled " + date(subscription.cancelledAt!) + ". No future orders are scheduled.",
  };
}

export function getRetentionOffer(reason: RetentionReason) {
  if (reason === "tooMuch") {
    return {
      title: "Pause for 60 days instead",
      description: "Give yourself time to finish what you have. No orders or charges while paused.",
      action: "Pause for 60 days",
    };
  }

  if (reason === "cost") {
    return {
      title: "Save with a slower delivery",
      description: "Switch to delivery every 60 days and keep your 15% subscription savings.",
      action: "Deliver every 60 days",
    };
  }

  if (reason === "different") {
    return {
      title: "Your routine can change",
      description: "Keep your 15% savings while you take time to find what works best for you.",
      action: "Keep my subscription",
    };
  }

  return {
    title: "Take a short pause",
    description: "Pause your deliveries for 30 days. You won’t be charged while paused.",
    action: "Pause for 30 days",
  };
}
