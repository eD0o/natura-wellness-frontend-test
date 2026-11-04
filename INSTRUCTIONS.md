# Skills test: two builds

Natura Wellness is a fictional online supplement brand made up for this test (any real company with a similar name is unrelated). Customers buy once or subscribe and save 15%, with a refill every 30 days. This test has two builds: one where the design and the product decisions are yours, and one from a finished design you match as closely as you can.

There's no time limit. Take the time you need and submit by the deadline we gave you.

Use any tools or AI you like. Use React with TypeScript; the starter is already set up.

We expect you to use AI, and we'll ask for a link to the conversation. We want to see how you directed it and checked its work, not just what it produced.

This folder is a Vite + React + TypeScript starter. Run `npm install && npm run dev`.

## Part A: design the subscription page

Build the "Manage my subscription" page in `src/part-a/SubscriptionCard.tsx`, using the mock API in `src/api/`. There's no design. We care more about your product and design decisions than about any particular layout.

The basics, from our customer service team:

- Customers should see at a glance what's coming next: which products, when they'll be charged, and how much.
- Customers should be able to skip their next shipment without contacting us. Skipping moves the next charge to the following cycle.
- Accidental skips create support tickets, so make sure the customer means it.
- Paused and cancelled subscriptions shouldn't look like active ones, and they shouldn't offer a skip.
- Most customers open this on their phone (375px wide), so it must work well there first.
- The API is sometimes slow and sometimes rejects a skip because the subscription changed elsewhere. The customer should always know what happened and what to do next.

Beyond the basics, it's yours. Customers come to this page to change something, and every customer who cancels is revenue we lose. Add what you think would help them most and keep more of them subscribed: for example, a cancellation flow that offers the right alternative for the customer's reason, changing how often it ships, swapping or adding a product, or pausing. Pick what you think matters most and do it well rather than doing everything.

What we know about cancellations: when customers cancel, the reasons they give are "I have too much product left" (38%), "it costs too much" (24%), "I'm trying a different product" (15%), "I didn't see results" (12%), and other reasons (11%). A customer who really wants to cancel must still be able to finish in a few taps. We don't trap customers.

Only skipping is in the mock API. Simulate anything else in local state; it doesn't need to survive a page reload. The other products we sell are in `catalog` in `src/api/fixtures.ts`.

Switch between test cases with the URL: `?fixture=active`, `?fixture=paused`, `?fixture=cancelled`, `?fixture=error`. Add `&conflict=always` to force the "subscription changed" error.

## Part B: match the design

Rebuild the product purchase box shown in `public/reference/buy-box.png` in `src/part-b/BuyBox.tsx`, as close to pixel-perfect as you can. The image is a 2x screenshot of a 1200px-wide browser window. The product photo, fonts, and copy (`src/part-b/copy.ts`) are provided; match spacing, sizes, and colors from the image.

It has to work, not just look right. Choosing a purchase option, a delivery frequency, and a quantity should all work, and everything on the box should stay in step with what the customer picked. Adding to the cart doesn't need to do anything.

## To submit

A public GitHub repo and a live link.

The easiest free way to get a live link: sign in to Vercel (vercel.com) with GitHub, click Add New → Project, pick your repo, and click Deploy. No settings to change. If you can't deploy, use `https://stackblitz.com/github/<your-username>/<your-repo>` as your live link instead.

When you submit, you'll give:

1. A link to your GitHub repo
2. Your live link (your Vercel URL, or the StackBlitz link above)
3. A link to your AI conversation(s), complete and unedited, not a summary: a share link from ChatGPT, Claude, Gemini, etc. If you worked in an editor like Cursor or Copilot, export the chat into your repo and give the file path. If you didn't use AI, write "none".
