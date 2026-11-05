import { useState } from "react";
import { copy } from "./copy";
import "./BuyBox.css";

type PurchaseOption = "oneTime" | "subscribe";

const currencyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const formatPrice = (cents: number) => currencyFormatter.format(cents / 100);

function CheckIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="buy-box__check"><path d="m4 10 3.6 3.6L16 5.8" fill="none" stroke="currentColor" strokeWidth="2.4" /></svg>;
}

function TrustIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="buy-box__trust-icon"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m7.8 12.1 2.7 2.7 5.7-6" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
}

export function BuyBox() {
  const [purchaseOption, setPurchaseOption] = useState<PurchaseOption>("subscribe");
  const [frequency, setFrequency] = useState(copy.subscribe.frequencyOptions[0]);
  const [quantity, setQuantity] = useState(1);
  const unitPrice = copy[purchaseOption].priceCents;
  const total = unitPrice * quantity;
  const isSubscription = purchaseOption === "subscribe";
  const renewalText = frequency === copy.subscribe.frequencyOptions[0]
    ? copy.finePrint
    : `Your subscription renews every ${frequency} at ${formatPrice(copy.subscribe.priceCents)} until you cancel. Skip or cancel anytime from your account.`;

  return (
    <main className="buy-box">
      <section className="buy-box__image-panel" aria-label={`${copy.title} product image`}>
        <img src="/product.jpg" alt="Natura Wellness Vitamin D bottle" />
      </section>

      <section className="buy-box__details" aria-labelledby="product-title">
        <p className="buy-box__eyebrow">{copy.eyebrow}</p>
        <div className="buy-box__rating" aria-label={`${copy.rating} out of 5 stars from ${copy.reviewCount}`}>
          <span className="buy-box__stars" aria-hidden="true">★★★★★</span><strong>{copy.rating}</strong><span className="buy-box__review-count">{copy.reviewCount}</span>
        </div>
        <h1 id="product-title">{copy.title}</h1>
        <p className="buy-box__subtitle">{copy.subtitle}</p>
        <div className="buy-box__divider" />

        <div className="buy-box__options" role="radiogroup" aria-label="Purchase option">
          <label className={`buy-box__option buy-box__one-time ${!isSubscription ? "is-selected" : ""}`}>
            <input className="buy-box__plan-input" type="radio" name="purchase-option" checked={!isSubscription} onChange={() => setPurchaseOption("oneTime")} />
            <span className="buy-box__option-title"><span className="buy-box__radio" />{copy.oneTime.label}</span><strong>{formatPrice(copy.oneTime.priceCents)}</strong>
          </label>
          <div className={`buy-box__option buy-box__subscription ${isSubscription ? "is-selected" : ""}`} onClick={() => setPurchaseOption("subscribe")}>
            <input id="subscription-option" className="buy-box__plan-input" type="radio" name="purchase-option" checked={isSubscription} onChange={() => setPurchaseOption("subscribe")} />
            <label className="buy-box__option-top" htmlFor="subscription-option">
              <span className="buy-box__option-title"><span className="buy-box__radio" />{copy.subscribe.label}<span className="buy-box__badge">{copy.subscribe.badge}</span></span>
              <span className="buy-box__price-stack"><strong>{formatPrice(copy.subscribe.priceCents)}</strong><s>{formatPrice(copy.subscribe.comparePriceCents)}</s></span>
            </label>
            {isSubscription && <>
              <label className="buy-box__frequency">
                <span>{copy.subscribe.frequencyLabel}</span>
                <span className="buy-box__select-wrap"><select value={frequency} aria-label="Delivery frequency" onFocus={() => setPurchaseOption("subscribe")} onChange={(event) => setFrequency(event.target.value)}>{copy.subscribe.frequencyOptions.map((option) => <option key={option}>{option}</option>)}</select><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" /></svg></span>
              </label>
              <ul className="buy-box__perks">{copy.subscribe.perks.map((perk) => <li key={perk}><CheckIcon />{perk}</li>)}</ul>
            </>}
          </div>
        </div>

        <div className="buy-box__purchase-row">
          <div className="buy-box__quantity" aria-label="Quantity">
            <button type="button" aria-label="Decrease quantity" disabled={quantity === 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button><output aria-live="polite">{quantity}</output><button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => value + 1)}>+</button>
          </div>
          <button type="button" className="buy-box__cart-button">{copy.addToCart}<span aria-hidden="true">·</span>{formatPrice(total)}</button>
        </div>
        <ul className="buy-box__trust">{copy.trust.map((item) => <li key={item}><TrustIcon />{item}</li>)}</ul>
        <p className="buy-box__fine-print">{isSubscription ? renewalText : "One-time purchase. Taxes and shipping are calculated at checkout."}</p>
      </section>
    </main>
  );
}
