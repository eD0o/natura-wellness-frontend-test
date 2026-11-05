import { useEffect, useRef, useState } from "react";
import { getSubscription, skipNextShipment } from "../api/mockApi";
import { ApiError, type Subscription, type SubscriptionStatus } from "../api/types";
import "./SubscriptionCard.css";

type RetentionReason = "tooMuch" | "cost" | "different" | "results" | "other";
type RetentionStep = "reason" | "offer";

const reasons: Array<{ id: RetentionReason; label: string }> = [
  { id: "tooMuch", label: "I have too much product left" },
  { id: "cost", label: "It costs too much" },
  { id: "different", label: "I’m trying a different product" },
  { id: "results", label: "I didn’t see results" },
  { id: "other", label: "Other" },
];

const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
const date = (value: string) => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
const shortDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

function StatusIcon({ status }: { status: SubscriptionStatus }) {
  return <span className={`subscription-card__status-icon subscription-card__status-icon--${status}`} aria-hidden="true">{status === "active" ? "✓" : status === "paused" ? "Ⅱ" : "–"}</span>;
}

function Notice({ children, tone = "success" }: { children: React.ReactNode; tone?: "success" | "error" }) {
  return <div className={`subscription-card__notice subscription-card__notice--${tone}`} role="status">{children}</div>;
}

export function SubscriptionCard() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [skipOpen, setSkipOpen] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retentionOpen, setRetentionOpen] = useState(false);
  const [retentionStep, setRetentionStep] = useState<RetentionStep>("reason");
  const [reason, setReason] = useState<RetentionReason>("tooMuch");
  const [focusResult, setFocusResult] = useState(false);
  const skipTriggerRef = useRef<HTMLButtonElement>(null);
  const cancelTriggerRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const skipDialogRef = useRef<HTMLElement>(null);
  const retentionDialogRef = useRef<HTMLElement>(null);

  const loadSubscription = async (): Promise<boolean> => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setSubscription(await getSubscription());
      return true;
    } catch (error) {
      setLoadError(error instanceof ApiError ? "We couldn’t load your subscription right now." : "Something went wrong. Please try again.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadSubscription(); }, []);
  useEffect(() => { if (skipOpen) skipDialogRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus(); }, [skipOpen]);
  useEffect(() => { if (retentionOpen) retentionDialogRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus(); }, [retentionOpen, retentionStep]);
  useEffect(() => {
    if (focusResult) {
      headingRef.current?.focus();
      setFocusResult(false);
    }
  }, [focusResult]);

  const trapDialogFocus = (event: React.KeyboardEvent<HTMLElement>, onClose: () => void) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) {
      event.preventDefault();
      event.currentTarget.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const closeSkip = () => {
    if (!isSkipping) {
      setSkipOpen(false);
      setSkipError(null);
      skipTriggerRef.current?.focus();
    }
  };

  const confirmSkip = async () => {
    if (!subscription) return;
    setIsSkipping(true);
    setSkipError(null);
    try {
      const updated = await skipNextShipment({ subscriptionId: subscription.id, expectedUpdatedAt: subscription.updatedAt });
      setSubscription(updated);
      setSkipOpen(false);
      setNotice(`Shipment skipped. Your next order is now ${shortDate(updated.nextChargeAt!)}.`);
      skipTriggerRef.current?.focus();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setSkipError("Your subscription changed somewhere else. Refresh it to see the latest details before trying again.");
      } else {
        setSkipError("We couldn’t skip this shipment. Your upcoming order is unchanged — please try again.");
      }
    } finally {
      setIsSkipping(false);
    }
  };

  const applyRetentionChoice = () => {
    if (!subscription) return;
    if (reason === "cost") {
      const nextChargeAt = subscription.nextChargeAt
        ? new Date(Date.parse(subscription.nextChargeAt) + (60 - subscription.intervalDays) * 86_400_000).toISOString()
        : null;
      setSubscription({ ...subscription, intervalDays: 60, nextChargeAt });
      setNotice(`Delivery frequency updated to every 60 days. Your next charge is ${shortDate(nextChargeAt!)} and your 15% savings stay the same.`);
    } else if (reason === "different") {
      setNotice("Your subscription is still active. You can explore other Natura Wellness products whenever you’re ready.");
    } else {
      const pauseLength = reason === "tooMuch" ? 60 : 30;
      setSubscription({ ...subscription, status: "paused", nextChargeAt: null, nextChargeTotalCents: null, pausedUntil: daysFromNow(pauseLength), cancelledAt: null });
      setNotice(`Your subscription is paused until ${shortDate(daysFromNow(pauseLength))}. No orders will be charged while it’s paused.`);
    }
    setRetentionOpen(false);
    setFocusResult(true);
  };

  const cancelSubscription = () => {
    if (!subscription) return;
    setSubscription({ ...subscription, status: "cancelled", nextChargeAt: null, nextChargeTotalCents: null, pausedUntil: null, cancelledAt: new Date().toISOString() });
    setRetentionOpen(false);
    setFocusResult(true);
    setNotice("Your subscription has been cancelled. You won’t be charged again.");
  };

  const refreshAfterConflict = async () => {
    setSkipOpen(false);
    if (await loadSubscription()) {
      setNotice("Subscription refreshed. Review the latest delivery details before trying again.");
    }
  };

  const closeRetention = () => {
    setRetentionOpen(false);
    cancelTriggerRef.current?.focus();
  };

  const offer = reason === "tooMuch"
    ? { title: "Pause for 60 days instead", description: "Give yourself time to finish what you have. No orders or charges while paused.", action: "Pause for 60 days" }
    : reason === "cost"
      ? { title: "Save with a slower delivery", description: "Switch to delivery every 60 days and keep your 15% subscription savings.", action: "Deliver every 60 days" }
      : reason === "different"
        ? { title: "Your routine can change", description: "Keep your 15% savings while you take time to find what works best for you.", action: "Keep my subscription" }
        : { title: "Take a short pause", description: "Pause your deliveries for 30 days. You won’t be charged while paused.", action: "Pause for 30 days" };

  if (isLoading) {
    return <main className="subscription-page"><div className="subscription-card subscription-card--loading" aria-busy="true" aria-live="polite"><span className="subscription-card__skeleton subscription-card__skeleton--title" /><span className="subscription-card__skeleton" /><span className="subscription-card__skeleton subscription-card__skeleton--large" /><p>Loading your subscription details...</p></div></main>;
  }

  if (loadError || !subscription) {
    return <main className="subscription-page"><section className="subscription-card subscription-card__error-state"><div className="subscription-card__error-mark" aria-hidden="true">!</div><h1>We couldn’t load your subscription</h1><p>{loadError ?? "Please try again."}</p><button className="subscription-card__button subscription-card__button--primary" type="button" onClick={() => void loadSubscription()}>Try again</button></section></main>;
  }

  const active = subscription.status === "active";
  const statusCopy = active
    ? { label: "Active", detail: `You’re saving ${subscription.discountPercent}% on every delivery.` }
    : subscription.status === "paused"
      ? { label: "Paused", detail: `Your deliveries resume ${date(subscription.pausedUntil!)}.` }
      : { label: "Cancelled", detail: `Cancelled ${date(subscription.cancelledAt!)}. No future orders are scheduled.` };

  return (
    <main className="subscription-page">
      <section className="subscription-card" aria-labelledby="subscription-title">
        <header className="subscription-card__header">
          <div>
            <p className="subscription-card__eyebrow">Natura Wellness</p>
            <h1 ref={headingRef} id="subscription-title" tabIndex={-1}>Your subscription</h1>
          </div>
          <span className={`subscription-card__status subscription-card__status--${subscription.status}`}><StatusIcon status={subscription.status} />{statusCopy.label}</span>
        </header>

        {notice && <Notice>{notice}<button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>×</button></Notice>}

        <section className="subscription-card__next" aria-labelledby="next-order-heading">
          <p className="subscription-card__section-label" id="next-order-heading">{active ? "Next delivery" : "Subscription status"}</p>
          {active ? <><strong>{date(subscription.nextChargeAt!)}</strong><p>You’ll be charged <b>{money(subscription.nextChargeTotalCents!)}</b> on this date.</p></> : <><strong>{statusCopy.detail}</strong><p>{subscription.status === "paused" ? "We’ll email you before your first renewed order." : "Come back anytime when you’re ready to restart."}</p></>}
        </section>

        <section className="subscription-card__items" aria-labelledby="items-heading">
          <div className="subscription-card__items-heading"><h2 id="items-heading">Your items</h2><span>Every {subscription.intervalDays} days</span></div>
          <ul>
            {subscription.items.map((item) => <li key={item.sku}>
              <div className="subscription-card__product-image">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span aria-hidden="true">N</span>}</div>
              <div><strong>{item.name}</strong><p>Quantity {item.quantity}</p></div>
              <span className="subscription-card__item-price"><b>{money(item.unitPriceCents * item.quantity)}</b><small>Regular price</small></span>
            </li>)}
          </ul>
          {active && <div className="subscription-card__price-summary"><div><span>Regular-price subtotal</span><span>{money(subscription.items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0))}</span></div><div><span>{subscription.discountPercent}% subscription savings</span><span>−{money(subscription.items.reduce((total, item) => total + item.unitPriceCents * item.quantity, 0) - subscription.nextChargeTotalCents!)}</span></div><div className="subscription-card__total"><span>Next order total</span><strong>{money(subscription.nextChargeTotalCents!)}</strong></div></div>}
        </section>

        {active && <section className="subscription-card__actions" aria-labelledby="delivery-actions-heading">
          <div><h2 id="delivery-actions-heading">Need more time?</h2><p>Skipping moves your next delivery out by {subscription.intervalDays} days.</p></div>
          <button ref={skipTriggerRef} className="subscription-card__button subscription-card__button--secondary" type="button" onClick={() => { setSkipError(null); setSkipOpen(true); }}>Skip next shipment</button>
        </section>}

        {active && <button ref={cancelTriggerRef} className="subscription-card__cancel-link" type="button" onClick={() => { setRetentionStep("reason"); setRetentionOpen(true); }}>Manage or cancel subscription</button>}
      </section>

      {skipOpen && <div className="subscription-card__overlay" role="presentation" onMouseDown={closeSkip}>
        <section ref={skipDialogRef} className="subscription-card__dialog" role="dialog" aria-modal="true" aria-labelledby="skip-title" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => trapDialogFocus(event, closeSkip)}>
          <button className="subscription-card__dialog-close" type="button" aria-label="Close" aria-disabled={isSkipping} onClick={closeSkip}>×</button>
          <p className="subscription-card__eyebrow">One quick check</p><h2 id="skip-title">Skip your next shipment?</h2>
          <p>Your order will move from <b>{date(subscription.nextChargeAt!)}</b> to <b>{date(new Date(Date.parse(subscription.nextChargeAt!) + subscription.intervalDays * 86_400_000).toISOString())}</b>. Your next charge will stay {money(subscription.nextChargeTotalCents!)}.</p>
          {skipError && <Notice tone="error">{skipError}</Notice>}
          <div className="subscription-card__dialog-actions">
            {skipError?.includes("Refresh") ? <button className="subscription-card__button subscription-card__button--primary" type="button" onClick={() => void refreshAfterConflict()}>Refresh subscription</button> : <button className="subscription-card__button subscription-card__button--primary" type="button" onClick={() => void confirmSkip()} disabled={isSkipping}>{isSkipping ? "Skipping shipment…" : "Yes, skip shipment"}</button>}
            <button className="subscription-card__button subscription-card__button--tertiary" type="button" aria-disabled={isSkipping} onClick={closeSkip}>Keep this delivery</button>
          </div>
        </section>
      </div>}

      {retentionOpen && <div className="subscription-card__overlay" role="presentation" onMouseDown={closeRetention}>
        <section ref={retentionDialogRef} className="subscription-card__dialog" role="dialog" aria-modal="true" aria-labelledby="retention-title" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()} onKeyDown={(event) => trapDialogFocus(event, closeRetention)}>
          <button className="subscription-card__dialog-close" type="button" aria-label="Close" onClick={closeRetention}>×</button>
          {retentionStep === "reason" ? <><p className="subscription-card__eyebrow">Before you go</p><h2 id="retention-title">What’s prompting this change?</h2><p>Your answer helps us make a more useful option for you.</p><fieldset className="subscription-card__reasons"><legend className="sr-only">Cancellation reason</legend>{reasons.map((item) => <label key={item.id}><input type="radio" name="reason" checked={reason === item.id} onChange={() => setReason(item.id)} />{item.label}</label>)}</fieldset><button className="subscription-card__button subscription-card__button--primary" type="button" onClick={() => setRetentionStep("offer")}>Continue</button></> : <><p className="subscription-card__eyebrow">An option for you</p><h2 id="retention-title">{offer.title}</h2><p>{offer.description}</p><div className="subscription-card__dialog-actions"><button className="subscription-card__button subscription-card__button--primary" type="button" onClick={applyRetentionChoice}>{offer.action}</button><button className="subscription-card__button subscription-card__button--tertiary" type="button" onClick={cancelSubscription}>No thanks, cancel subscription</button></div></>}
        </section>
      </div>}
    </main>
  );
}
