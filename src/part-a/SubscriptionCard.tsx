import { useEffect, useRef, useState } from "react";
import { getSubscription, skipNextShipment } from "../api/mockApi";
import { ApiError, type Subscription, type SubscriptionStatus } from "../api/types";
import "./SubscriptionCard.css";

type Modal = "skip" | "retention" | null;
type RetentionReason = "tooMuch" | "cost" | "different" | "results" | "other";
type RetentionStep = "reason" | "offer";
type SubscriptionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; subscription: Subscription };

const reasons: Array<{ id: RetentionReason; label: string }> = [
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

const money = (cents: number) => currencyFormatter.format(cents / 100);
const date = (value: string) => longDateFormatter.format(new Date(value));
const shortDate = (value: string) => shortDateFormatter.format(new Date(value));
const daysFromNow = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

function getStatusCopy(subscription: Subscription) {
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

function getRetentionOffer(reason: RetentionReason) {
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

function StatusIcon({ status }: { status: SubscriptionStatus }) {
  const symbol = status === "active" ? "✓" : status === "paused" ? "Ⅱ" : "–";

  return (
    <span
      className={"subscription-card__status-icon subscription-card__status-icon--" + status}
      aria-hidden="true"
    >
      {symbol}
    </span>
  );
}

function Notice({
  children,
  tone = "success",
}: {
  children: React.ReactNode;
  tone?: "success" | "error";
}) {
  return (
    <div className={"subscription-card__notice subscription-card__notice--" + tone} role="status">
      {children}
    </div>
  );
}

type DialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => void;

interface SkipDialogProps {
  subscription: Subscription;
  dialogRef: React.RefObject<HTMLElement | null>;
  isSkipping: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
  onRefresh: () => void;
  onKeyDown: DialogKeyDown;
}

function SkipDialog({
  subscription,
  dialogRef,
  isSkipping,
  error,
  onClose,
  onConfirm,
  onRefresh,
  onKeyDown,
}: SkipDialogProps) {
  const skippedDate = new Date(
    Date.parse(subscription.nextChargeAt!) + subscription.intervalDays * 86_400_000,
  ).toISOString();

  return (
    <div className="subscription-card__overlay" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className="subscription-card__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="skip-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <button
          className="subscription-card__dialog-close"
          type="button"
          aria-label="Close"
          aria-disabled={isSkipping}
          onClick={onClose}
        >
          ×
        </button>
        <p className="subscription-card__eyebrow">One quick check</p>
        <h2 id="skip-title">Skip your next shipment?</h2>
        <p>
          Your order will move from <b>{date(subscription.nextChargeAt!)}</b> to{" "}
          <b>{date(skippedDate)}</b>. Your next charge will stay {money(subscription.nextChargeTotalCents!)}.
        </p>

        {error && <Notice tone="error">{error}</Notice>}

        <div className="subscription-card__dialog-actions">
          {error?.includes("Refresh") ? (
            <button
              className="subscription-card__button subscription-card__button--primary"
              type="button"
              onClick={onRefresh}
            >
              Refresh subscription
            </button>
          ) : (
            <button
              className="subscription-card__button subscription-card__button--primary"
              type="button"
              onClick={onConfirm}
              disabled={isSkipping}
            >
              {isSkipping ? "Skipping shipment…" : "Yes, skip shipment"}
            </button>
          )}
          <button
            className="subscription-card__button subscription-card__button--tertiary"
            type="button"
            aria-disabled={isSkipping}
            onClick={onClose}
          >
            Keep this delivery
          </button>
        </div>
      </section>
    </div>
  );
}

interface RetentionDialogProps {
  dialogRef: React.RefObject<HTMLElement | null>;
  reason: RetentionReason;
  step: RetentionStep;
  offer: ReturnType<typeof getRetentionOffer>;
  onClose: () => void;
  onReasonChange: (reason: RetentionReason) => void;
  onContinue: () => void;
  onAcceptOffer: () => void;
  onCancel: () => void;
  onKeyDown: DialogKeyDown;
}

function RetentionDialog({
  dialogRef,
  reason,
  step,
  offer,
  onClose,
  onReasonChange,
  onContinue,
  onAcceptOffer,
  onCancel,
  onKeyDown,
}: RetentionDialogProps) {
  return (
    <div className="subscription-card__overlay" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        className="subscription-card__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="retention-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <button
          className="subscription-card__dialog-close"
          type="button"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>

        {step === "reason" ? (
          <>
            <p className="subscription-card__eyebrow">Before you go</p>
            <h2 id="retention-title">What’s prompting this change?</h2>
            <p>Your answer helps us make a more useful option for you.</p>
            <fieldset className="subscription-card__reasons">
              <legend className="sr-only">Cancellation reason</legend>
              {reasons.map((item) => (
                <label key={item.id}>
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === item.id}
                    onChange={() => onReasonChange(item.id)}
                  />
                  {item.label}
                </label>
              ))}
            </fieldset>
            <button
              className="subscription-card__button subscription-card__button--primary"
              type="button"
              onClick={onContinue}
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <p className="subscription-card__eyebrow">An option for you</p>
            <h2 id="retention-title">{offer.title}</h2>
            <p>{offer.description}</p>
            <div className="subscription-card__dialog-actions">
              <button
                className="subscription-card__button subscription-card__button--primary"
                type="button"
                onClick={onAcceptOffer}
              >
                {offer.action}
              </button>
              <button
                className="subscription-card__button subscription-card__button--tertiary"
                type="button"
                onClick={onCancel}
              >
                No thanks, cancel subscription
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export function SubscriptionCard() {
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>({
    status: "loading",
  });
  const [activeModal, setActiveModal] = useState<Modal>(null);
  const [isSkipping, setIsSkipping] = useState(false);
  const [skipError, setSkipError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [retentionStep, setRetentionStep] = useState<RetentionStep>("reason");
  const [reason, setReason] = useState<RetentionReason>("tooMuch");
  const [focusResult, setFocusResult] = useState(false);
  const skipTriggerRef = useRef<HTMLButtonElement>(null);
  const cancelTriggerRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const skipDialogRef = useRef<HTMLElement>(null);
  const retentionDialogRef = useRef<HTMLElement>(null);

  const loadSubscription = async (): Promise<boolean> => {
    setSubscriptionState({ status: "loading" });

    try {
      const subscription = await getSubscription();
      setSubscriptionState({ status: "ready", subscription });
      return true;
    } catch (error) {
      setSubscriptionState({
        status: "error",
        message: error instanceof ApiError
          ? "We couldn’t load your subscription right now."
          : "Something went wrong. Please try again.",
      });
      return false;
    }
  };

  useEffect(() => {
    void loadSubscription();
  }, []);

  useEffect(() => {
    if (activeModal === "skip") {
      skipDialogRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
    }
  }, [activeModal]);

  useEffect(() => {
    if (activeModal === "retention") {
      retentionDialogRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
    }
  }, [activeModal, retentionStep]);

  useEffect(() => {
    if (focusResult) {
      headingRef.current?.focus();
      setFocusResult(false);
    }
  }, [focusResult]);

  useEffect(() => {
    const navigation = document.querySelector("nav");
    if (!activeModal || !navigation) return;

    navigation.setAttribute("inert", "");
    navigation.setAttribute("aria-hidden", "true");

    return () => {
      navigation.removeAttribute("inert");
      navigation.removeAttribute("aria-hidden");
    };
  }, [activeModal]);

  const trapDialogFocus = (
    event: React.KeyboardEvent<HTMLElement>,
    onClose: () => void,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    );

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

  const openSkip = () => {
    setSkipError(null);
    setActiveModal("skip");
  };

  const closeSkip = () => {
    if (isSkipping) return;

    setActiveModal(null);
    setSkipError(null);
    skipTriggerRef.current?.focus();
  };

  const confirmSkip = async () => {
    if (subscriptionState.status !== "ready") return;

    const subscription = subscriptionState.subscription;
    setIsSkipping(true);
    setSkipError(null);

    try {
      const updated = await skipNextShipment({
        subscriptionId: subscription.id,
        expectedUpdatedAt: subscription.updatedAt,
      });
      setSubscriptionState({ status: "ready", subscription: updated });
      setActiveModal(null);
      setNotice("Shipment skipped. Your next order is now " + shortDate(updated.nextChargeAt!) + ".");
      skipTriggerRef.current?.focus();
    } catch (error) {
      const message = error instanceof ApiError && error.status === 409
        ? "Your subscription changed somewhere else. Refresh it to see the latest details before trying again."
        : "We couldn’t skip this shipment. Your upcoming order is unchanged — please try again.";
      setSkipError(message);
    } finally {
      setIsSkipping(false);
    }
  };

  const refreshAfterConflict = async () => {
    setActiveModal(null);

    if (await loadSubscription()) {
      setNotice("Subscription refreshed. Review the latest delivery details before trying again.");
    }
  };

  const openRetention = () => {
    setRetentionStep("reason");
    setActiveModal("retention");
  };

  const closeRetention = () => {
    setActiveModal(null);
    cancelTriggerRef.current?.focus();
  };

  const applyRetentionChoice = () => {
    if (subscriptionState.status !== "ready") return;

    const subscription = subscriptionState.subscription;

    if (reason === "cost") {
      const nextChargeAt = subscription.nextChargeAt
        ? new Date(
          Date.parse(subscription.nextChargeAt) + (60 - subscription.intervalDays) * 86_400_000,
        ).toISOString()
        : null;

      setSubscriptionState({
        status: "ready",
        subscription: { ...subscription, intervalDays: 60, nextChargeAt },
      });
      setNotice(
        "Delivery frequency updated to every 60 days. Your next charge is "
          + shortDate(nextChargeAt!)
          + " and your 15% savings stay the same.",
      );
    } else if (reason === "different") {
      setNotice(
        "Your subscription is still active. You can explore other Natura Wellness products whenever you’re ready.",
      );
    } else {
      const pauseLength = reason === "tooMuch" ? 60 : 30;
      const pausedUntil = daysFromNow(pauseLength);

      setSubscriptionState({
        status: "ready",
        subscription: {
          ...subscription,
          status: "paused",
          nextChargeAt: null,
          nextChargeTotalCents: null,
          pausedUntil,
          cancelledAt: null,
        },
      });
      setNotice(
        "Your pause ends "
          + shortDate(pausedUntil)
          + ". No delivery or charge is scheduled yet; we'll email you before your next order is set.",
      );
    }

    setActiveModal(null);
    setFocusResult(true);
  };

  const cancelSubscription = () => {
    if (subscriptionState.status !== "ready") return;

    setSubscriptionState({
      status: "ready",
      subscription: {
        ...subscriptionState.subscription,
        status: "cancelled",
        nextChargeAt: null,
        nextChargeTotalCents: null,
        pausedUntil: null,
        cancelledAt: new Date().toISOString(),
      },
    });
    setActiveModal(null);
    setNotice("Your subscription has been cancelled. You won’t be charged again.");
    setFocusResult(true);
  };

  if (subscriptionState.status === "loading") {
    return (
      <main className="subscription-page">
        <div className="subscription-card subscription-card--loading" aria-busy="true" aria-live="polite">
          <span className="subscription-card__skeleton subscription-card__skeleton--title" />
          <span className="subscription-card__skeleton" />
          <span className="subscription-card__skeleton subscription-card__skeleton--large" />
          <p>Loading your subscription details...</p>
        </div>
      </main>
    );
  }

  if (subscriptionState.status === "error") {
    return (
      <main className="subscription-page">
        <section className="subscription-card subscription-card__error-state">
          <div className="subscription-card__error-mark" aria-hidden="true">!</div>
          <h1>We couldn’t load your subscription</h1>
          <p>{subscriptionState.message}</p>
          <button
            className="subscription-card__button subscription-card__button--primary"
            type="button"
            onClick={() => void loadSubscription()}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  const subscription = subscriptionState.subscription;
  const active = subscription.status === "active";
  const regularSubtotal = subscription.items.reduce(
    (total, item) => total + item.unitPriceCents * item.quantity,
    0,
  );
  const subscriptionSavings = active
    ? regularSubtotal - subscription.nextChargeTotalCents!
    : 0;
  const status = getStatusCopy(subscription);
  const offer = getRetentionOffer(reason);

  return (
    <>
      <main
        className="subscription-page"
        aria-hidden={activeModal !== null || undefined}
        inert={activeModal !== null}
      >
        <section className="subscription-card" aria-labelledby="subscription-title">
          <header className="subscription-card__header">
            <div>
              <p className="subscription-card__eyebrow">Natura Wellness</p>
              <h1 ref={headingRef} id="subscription-title" tabIndex={-1}>
                Your subscription
              </h1>
            </div>
            <span className={"subscription-card__status subscription-card__status--" + subscription.status}>
              <StatusIcon status={subscription.status} />
              {status.label}
            </span>
          </header>

          {notice && (
            <Notice>
              {notice}
              <button type="button" aria-label="Dismiss notification" onClick={() => setNotice(null)}>
                ×
              </button>
            </Notice>
          )}

          <section className="subscription-card__next" aria-labelledby="next-order-heading">
            <p className="subscription-card__section-label" id="next-order-heading">
              {active ? "Next delivery" : "Subscription status"}
            </p>
            {active ? (
              <>
                <strong>{date(subscription.nextChargeAt!)}</strong>
                <p>
                  You’ll be charged <b>{money(subscription.nextChargeTotalCents!)}</b> on this date.
                </p>
              </>
            ) : (
              <>
                <strong>{status.detail}</strong>
                <p>
                  {subscription.status === "paused"
                    ? "No delivery or charge is scheduled yet. We’ll email you before your next order is set."
                    : "Come back anytime when you’re ready to restart."}
                </p>
              </>
            )}
          </section>

          <section className="subscription-card__items" aria-labelledby="items-heading">
            <div className="subscription-card__items-heading">
              <h2 id="items-heading">Your items</h2>
              <span>Every {subscription.intervalDays} days</span>
            </div>
            <ul>
              {subscription.items.map((item) => (
                <li key={item.sku}>
                  <div className="subscription-card__product-image">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" />
                    ) : (
                      <span aria-hidden="true">N</span>
                    )}
                  </div>
                  <div>
                    <strong>{item.name}</strong>
                    <p>Quantity {item.quantity}</p>
                  </div>
                  <span className="subscription-card__item-price">
                    <b>{money(item.unitPriceCents * item.quantity)}</b>
                    <small>Regular price</small>
                  </span>
                </li>
              ))}
            </ul>

            {active && (
              <div className="subscription-card__price-summary">
                <div>
                  <span>Regular-price subtotal</span>
                  <span>{money(regularSubtotal)}</span>
                </div>
                <div>
                  <span>{subscription.discountPercent}% subscription savings</span>
                  <span>−{money(subscriptionSavings)}</span>
                </div>
                <div className="subscription-card__total">
                  <span>Next order total</span>
                  <strong>{money(subscription.nextChargeTotalCents!)}</strong>
                </div>
              </div>
            )}
          </section>

          {active && (
            <section className="subscription-card__actions" aria-labelledby="delivery-actions-heading">
              <div>
                <h2 id="delivery-actions-heading">Need more time?</h2>
                <p>Skipping moves your next delivery out by {subscription.intervalDays} days.</p>
              </div>
              <button
                ref={skipTriggerRef}
                className="subscription-card__button subscription-card__button--secondary"
                type="button"
                onClick={openSkip}
              >
                Skip next shipment
              </button>
            </section>
          )}

          {active && (
            <button
              ref={cancelTriggerRef}
              className="subscription-card__cancel-link"
              type="button"
              onClick={openRetention}
            >
              Manage or cancel subscription
            </button>
          )}
        </section>
      </main>

      {activeModal === "skip" && (
        <SkipDialog
          subscription={subscription}
          dialogRef={skipDialogRef}
          isSkipping={isSkipping}
          error={skipError}
          onClose={closeSkip}
          onConfirm={() => void confirmSkip()}
          onRefresh={() => void refreshAfterConflict()}
          onKeyDown={(event) => trapDialogFocus(event, closeSkip)}
        />
      )}

      {activeModal === "retention" && (
        <RetentionDialog
          dialogRef={retentionDialogRef}
          reason={reason}
          step={retentionStep}
          offer={offer}
          onClose={closeRetention}
          onReasonChange={setReason}
          onContinue={() => setRetentionStep("offer")}
          onAcceptOffer={applyRetentionChoice}
          onCancel={cancelSubscription}
          onKeyDown={(event) => trapDialogFocus(event, closeRetention)}
        />
      )}
    </>
  );
}
