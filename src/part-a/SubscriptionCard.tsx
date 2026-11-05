import { useEffect, useRef, useState } from "react";
import { getSubscription, skipNextShipment } from "../api/mockApi";
import { ApiError, type Subscription } from "../api/types";
import { RetentionDialog } from "./RetentionDialog";
import { SkipDialog } from "./SkipDialog";
import { SubscriptionSummary } from "./SubscriptionSummary";
import {
  daysFromNow,
  shortDate,
  type RetentionReason,
  type RetentionStep,
} from "./subscriptionUtils";
import "./SubscriptionCard.css";

type Modal = "skip" | "retention" | null;
type SubscriptionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; subscription: Subscription };

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

  return (
    <>
      <main
        className="subscription-page"
        aria-hidden={activeModal !== null || undefined}
        inert={activeModal !== null}
      >
        <SubscriptionSummary
          subscription={subscription}
          notice={notice}
          headingRef={headingRef}
          skipTriggerRef={skipTriggerRef}
          cancelTriggerRef={cancelTriggerRef}
          onDismissNotice={() => setNotice(null)}
          onOpenSkip={openSkip}
          onOpenRetention={openRetention}
        />
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
