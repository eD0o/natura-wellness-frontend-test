import type { Subscription, SubscriptionStatus } from "../api/types";
import { date, getStatusCopy, money } from "./subscriptionUtils";

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

interface SubscriptionSummaryProps {
  subscription: Subscription;
  notice: string | null;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  skipTriggerRef: React.RefObject<HTMLButtonElement | null>;
  cancelTriggerRef: React.RefObject<HTMLButtonElement | null>;
  onDismissNotice: () => void;
  onOpenSkip: () => void;
  onOpenRetention: () => void;
}

export function SubscriptionSummary({
  subscription,
  notice,
  headingRef,
  skipTriggerRef,
  cancelTriggerRef,
  onDismissNotice,
  onOpenSkip,
  onOpenRetention,
}: SubscriptionSummaryProps) {
  const active = subscription.status === "active";
  const regularSubtotal = subscription.items.reduce(
    (total, item) => total + item.unitPriceCents * item.quantity,
    0,
  );
  const subscriptionSavings = active
    ? regularSubtotal - subscription.nextChargeTotalCents!
    : 0;
  const status = getStatusCopy(subscription);

  return (
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
        <div className="subscription-card__notice subscription-card__notice--success" role="status">
          {notice}
          <button type="button" aria-label="Dismiss notification" onClick={onDismissNotice}>
            ×
          </button>
        </div>
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
                {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span aria-hidden="true">N</span>}
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
            onClick={onOpenSkip}
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
          onClick={onOpenRetention}
        >
          Manage or cancel subscription
        </button>
      )}
    </section>
  );
}
