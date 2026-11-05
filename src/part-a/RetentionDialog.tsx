import { getRetentionOffer, retentionReasons, type RetentionReason, type RetentionStep } from "./subscriptionUtils";

type DialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => void;

interface RetentionDialogProps {
  dialogRef: React.RefObject<HTMLElement | null>;
  reason: RetentionReason;
  step: RetentionStep;
  onClose: () => void;
  onReasonChange: (reason: RetentionReason) => void;
  onContinue: () => void;
  onAcceptOffer: () => void;
  onCancel: () => void;
  onKeyDown: DialogKeyDown;
}

export function RetentionDialog({
  dialogRef,
  reason,
  step,
  onClose,
  onReasonChange,
  onContinue,
  onAcceptOffer,
  onCancel,
  onKeyDown,
}: RetentionDialogProps) {
  const offer = getRetentionOffer(reason);

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
              {retentionReasons.map((item) => (
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
