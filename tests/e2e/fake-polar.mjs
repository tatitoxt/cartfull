/**
 * Local stand-in for the parts of the Polar API Cartfull calls, used by the
 * end-to-end tests so they run without a Polar account. It serves a minimal
 * hosted Checkout page and Customer Portal page, and delivers signed webhooks
 * to the app exactly as Polar would.
 *
 *   node tests/e2e/fake-polar.mjs
 */
import { createHmac, randomBytes } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_POLAR_PORT ?? 12111);
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET ?? "whsec_test";
const DAY = 24 * 60 * 60;

const id = (prefix) => `${prefix}_${randomBytes(8).toString("hex")}`;
const now = () => Math.floor(Date.now() / 1000);
const iso = (seconds) => new Date(seconds * 1000).toISOString();
const customers = new Map();
const checkouts = new Map();
const subscriptions = new Map();

async function sendWebhook(type, data) {
  const payload = JSON.stringify({ type, timestamp: iso(now()), data });
  const webhookId = id("evt");
  const timestamp = now();
  // standardwebhooks scheme: key is the base64-decoded secret minus the whsec_ prefix.
  const key = Buffer.from(WEBHOOK_SECRET.replace(/^whsec_/, ""), "base64");
  const signature = createHmac("sha256", key).update(`${webhookId}.${timestamp}.${payload}`).digest("base64");
  const response = await fetch(`${APP_URL}/api/polar/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": webhookId,
      "webhook-timestamp": String(timestamp),
      "webhook-signature": `v1,${signature}`,
    },
    body: payload,
  });
  if (!response.ok) console.error(`webhook ${type} -> ${response.status}`);
}

function customerFor(checkout) {
  if (!customers.has(checkout.customer_id)) {
    customers.set(checkout.customer_id, {
      id: checkout.customer_id,
      external_id: checkout.external_customer_id ?? null,
      email: checkout.customer_email ?? null,
    });
  }
  return customers.get(checkout.customer_id);
}

function createSubscription(checkout) {
  const trialDays = checkout.trial_interval === "day" ? (checkout.trial_interval_count ?? 0) : 0;
  const interval = checkout.product_id === process.env.POLAR_PRODUCT_MONTHLY ? "month" : "year";
  const start = now();
  const trialEnd = trialDays ? start + trialDays * DAY : null;
  const end = trialEnd ?? start + (interval === "month" ? 30 : 365) * DAY;
  const subscription = {
    id: id("sub"),
    created_at: iso(start),
    modified_at: null,
    amount: 999,
    currency: "USD",
    recurring_interval: interval,
    recurring_interval_count: 1,
    status: trialDays ? "trialing" : "active",
    current_period_start: iso(start),
    current_period_end: iso(end),
    trial_start: trialEnd ? iso(start) : null,
    trial_end: trialEnd ? iso(trialEnd) : null,
    cancel_at_period_end: false,
    canceled_at: null,
    started_at: iso(start),
    ends_at: null,
    ended_at: null,
    customer_id: checkout.customer_id,
    product_id: checkout.product_id,
    discount_id: checkout.discount_id ?? null,
    metadata: checkout.metadata ?? {},
    customer: customerFor(checkout),
    product: { id: checkout.product_id, name: "Test product", recurring_interval: interval },
  };
  subscriptions.set(subscription.id, subscription);
  return subscription;
}

const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${title}</title><style>body{font:16px system-ui;max-width:28rem;margin:3rem auto;padding:0 1rem}button,a.button{font:inherit;padding:.75rem 1.25rem;margin:.25rem .25rem 0 0;display:inline-block}</style></head>
<body><h1>${title}</h1>${body}</body></html>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const json = (status, data) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(data));
  };
  const html = (content) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(content);
  };
  const redirect = (location) => {
    res.writeHead(303, { location });
    res.end();
  };
  const route = `${req.method} ${url.pathname}`;
  const isApi = url.pathname.startsWith("/v1/");
  let body = {};
  if (raw && isApi) {
    try { body = JSON.parse(raw); } catch { body = {}; }
  } else if (raw) {
    body = Object.fromEntries(new URLSearchParams(raw));
  }

  try {
    if (route === "POST /v1/checkouts/") {
      const checkoutId = id("chk");
      const checkout = {
        id: checkoutId,
        status: "open",
        product_id: body.products?.[0],
        products: body.products ?? [],
        external_customer_id: body.external_customer_id ?? null,
        customer_email: body.customer_email ?? null,
        customer_id: id("cus"),
        trial_interval: body.allow_trial === false ? null : (body.trial_interval ?? null),
        trial_interval_count: body.allow_trial === false ? null : (body.trial_interval_count ?? null),
        discount_id: body.discount_id ?? null,
        metadata: body.metadata ?? {},
        success_url: (body.success_url ?? "").replace("{CHECKOUT_ID}", checkoutId),
        return_url: body.return_url ?? null,
        url: `http://localhost:${PORT}/pay/${checkoutId}`,
      };
      customers.set(checkout.customer_id, {
        id: checkout.customer_id,
        external_id: checkout.external_customer_id,
        email: checkout.customer_email,
      });
      checkouts.set(checkoutId, checkout);
      return json(200, checkout);
    }

    const subscriptionMatch = url.pathname.match(/^\/v1\/subscriptions\/([\w-]+)$/);
    if (req.method === "GET" && subscriptionMatch) {
      const subscription = subscriptions.get(subscriptionMatch[1]);
      return subscription ? json(200, subscription) : json(404, { error: "No such subscription" });
    }
    if (req.method === "DELETE" && subscriptionMatch) {
      const subscription = subscriptions.get(subscriptionMatch[1]);
      if (!subscription) return json(404, { error: "No such subscription" });
      subscription.status = "canceled";
      subscription.ended_at = iso(now());
      await sendWebhook("subscription.revoked", subscription);
      return json(200, subscription);
    }

    if (route === "POST /v1/customer-sessions/") {
      const customer = [...customers.values()].find((c) => c.external_id === body.external_customer_id || c.id === body.customer_id);
      const query = new URLSearchParams({ customer: customer?.id ?? "", return_url: body.return_url ?? APP_URL });
      return json(200, { id: id("csess"), customer_portal_url: `http://localhost:${PORT}/portal?${query}` });
    }

    // Hosted pages a shopper sees.
    const payMatch = url.pathname.match(/^\/pay\/(\w+)$/);
    if (payMatch) {
      const checkout = checkouts.get(payMatch[1]);
      if (!checkout) return json(404, { error: "No such checkout" });
      if (req.method === "GET") {
        const trial = checkout.trial_interval_count;
        return html(
          page(
            "Test checkout",
            `<p data-testid="checkout-summary">${trial ? `${trial}-day free trial, then ` : ""}product ${checkout.product_id}</p>
             <form method="post"><button name="action" value="pay" data-testid="fake-pay">Subscribe</button>
             <button name="action" value="cancel" data-testid="fake-cancel">Back</button></form>`,
          ),
        );
      }
      if (body.action === "cancel") return redirect(checkout.return_url ?? APP_URL);
      const subscription = createSubscription(checkout);
      checkout.status = "succeeded";
      await sendWebhook("subscription.created", subscription);
      return redirect(checkout.success_url);
    }

    if (url.pathname === "/portal") {
      const customerId = url.searchParams.get("customer");
      const returnUrl = url.searchParams.get("return_url");
      const subscription = [...subscriptions.values()].find((s) => s.customer_id === customerId);
      if (req.method === "POST" && subscription) {
        if (body.action === "cancel") {
          subscription.status = "canceled";
          subscription.cancel_at_period_end = false;
          await sendWebhook("subscription.revoked", subscription);
        }
        return redirect(returnUrl);
      }
      return html(
        page(
          "Test billing portal",
          `<p data-testid="portal-status">Subscription: ${subscription?.status ?? "none"}</p>
           <form method="post"><button name="action" value="cancel" data-testid="fake-portal-cancel">Cancel subscription</button></form>
           <a class="button" href="${returnUrl}" data-testid="fake-portal-return">Return to Cartfull</a>`,
        ),
      );
    }

    if (route === "GET /health") return json(200, { ok: true });
    return json(404, { error: `Not implemented in the test stand-in: ${route}` });
  } catch (error) {
    console.error(error);
    return json(500, { error: String(error) });
  }
});

server.listen(PORT, () => console.log(`Fake Polar listening on http://localhost:${PORT}`));
