import type { Subscription } from "../api/types";
import { date, money } from "./subscriptionUtils";

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

export function SkipDialog({
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

        {error && (
          <div className="subscription-card__notice subscription-card__notice--error" role="status">
            {error}
          </div>
        )}

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
