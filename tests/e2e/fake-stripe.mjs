/**
 * Local stand-in for the parts of the Stripe API Cartfull calls, used by the
 * end-to-end tests so they run without a Stripe account. It serves a minimal
 * hosted Checkout page and Customer Portal page, and delivers signed webhooks
 * to the app exactly as Stripe would.
 *
 *   node tests/e2e/fake-stripe.mjs
 */
import { createHmac, randomBytes } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_STRIPE_PORT ?? 12111);
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_test";
const DAY = 24 * 60 * 60;

const id = (prefix) => `${prefix}_${randomBytes(8).toString("hex")}`;
const now = () => Math.floor(Date.now() / 1000);
const customers = new Map();
const sessions = new Map();
const subscriptions = new Map();

/** Parses Stripe's form encoding (a[b][0][c]=1) into nested objects. */
function parseForm(body) {
  const out = {};
  for (const [key, value] of new URLSearchParams(body)) {
    const path = key.replace(/\]/g, "").split("[");
    let node = out;
    path.forEach((part, index) => {
      if (index === path.length - 1) node[part] = value;
      else node = node[part] ??= {};
    });
  }
  return out;
}

async function sendWebhook(type, object) {
  const payload = JSON.stringify({
    id: id("evt"),
    object: "event",
    api_version: "2025-01-01",
    created: now(),
    type,
    data: { object },
  });
  const timestamp = now();
  const signature = createHmac("sha256", WEBHOOK_SECRET).update(`${timestamp}.${payload}`).digest("hex");
  const response = await fetch(`${APP_URL}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": `t=${timestamp},v1=${signature}` },
    body: payload,
  });
  if (!response.ok) console.error(`webhook ${type} -> ${response.status}`);
}

function createSubscription(session) {
  const trialDays = Number(session.subscription_data?.trial_period_days ?? 0);
  const interval = session.price === process.env.STRIPE_PRICE_MONTHLY ? "month" : "year";
  const start = now();
  const trialEnd = trialDays ? start + trialDays * DAY : null;
  const subscription = {
    id: id("sub"),
    object: "subscription",
    customer: session.customer,
    status: trialDays ? "trialing" : "active",
    metadata: session.subscription_data?.metadata ?? {},
    trial_end: trialEnd,
    cancel_at_period_end: false,
    items: {
      object: "list",
      data: [
        {
          id: id("si"),
          current_period_end: trialEnd ?? start + (interval === "month" ? 30 : 365) * DAY,
          price: { id: session.price, recurring: { interval } },
        },
      ],
    },
  };
  subscriptions.set(subscription.id, subscription);
  return subscription;
}

const page = (title, body) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${title}</title><style>body{font:16px system-ui;max-width:28rem;margin:3rem auto;padding:0 1rem}button,a.button{font:inherit;padding:.75rem 1.25rem;margin:.25rem .25rem 0 0;display:inline-block}</style></head>
<body><h1>${title}</h1>${body}</body></html>`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let body = "";
  for await (const chunk of req) body += chunk;
  const form = parseForm(body);
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

  try {
    if (route === "POST /v1/customers") {
      const customer = { id: id("cus"), object: "customer", email: form.email ?? null, metadata: form.metadata ?? {} };
      customers.set(customer.id, customer);
      return json(200, customer);
    }

    if (route === "POST /v1/checkout/sessions") {
      const sessionId = id("cs_test");
      const session = {
        id: sessionId,
        object: "checkout.session",
        mode: form.mode,
        customer: form.customer,
        client_reference_id: form.client_reference_id,
        price: form.line_items?.[0]?.price,
        subscription_data: form.subscription_data ?? {},
        success_url: form.success_url.replace("{CHECKOUT_SESSION_ID}", sessionId),
        cancel_url: form.cancel_url,
        subscription: null,
        url: `http://localhost:${PORT}/pay/${sessionId}`,
      };
      sessions.set(sessionId, session);
      return json(200, session);
    }

    const subscriptionMatch = url.pathname.match(/^\/v1\/subscriptions\/(\w+)$/);
    if (req.method === "GET" && subscriptionMatch) {
      const subscription = subscriptions.get(subscriptionMatch[1]);
      return subscription ? json(200, subscription) : json(404, { error: { message: "No such subscription" } });
    }

    if (route === "POST /v1/billing_portal/sessions") {
      const portalId = id("bps");
      const query = new URLSearchParams({ customer: form.customer, return_url: form.return_url });
      return json(200, { id: portalId, object: "billing_portal.session", url: `http://localhost:${PORT}/portal?${query}` });
    }

    // Hosted pages a shopper sees.
    const payMatch = url.pathname.match(/^\/pay\/(\w+)$/);
    if (payMatch) {
      const session = sessions.get(payMatch[1]);
      if (!session) return json(404, { error: { message: "No such session" } });
      if (req.method === "GET") {
        const trial = session.subscription_data?.trial_period_days;
        return html(
          page(
            "Test checkout",
            `<p data-testid="checkout-summary">${trial ? `${trial}-day free trial, then ` : ""}price ${session.price}</p>
             <form method="post"><button name="action" value="pay" data-testid="fake-pay">Subscribe</button>
             <button name="action" value="cancel" data-testid="fake-cancel">Back</button></form>`,
          ),
        );
      }
      if (form.action === "cancel") return redirect(session.cancel_url);
      const subscription = createSubscription(session);
      session.subscription = subscription.id;
      await sendWebhook("checkout.session.completed", session);
      await sendWebhook("customer.subscription.created", subscription);
      return redirect(session.success_url);
    }

    if (url.pathname === "/portal") {
      const customer = url.searchParams.get("customer");
      const returnUrl = url.searchParams.get("return_url");
      const subscription = [...subscriptions.values()].find((s) => s.customer === customer);
      if (req.method === "POST" && subscription) {
        if (form.action === "cancel") {
          subscription.status = "canceled";
          subscription.cancel_at_period_end = false;
          await sendWebhook("customer.subscription.deleted", subscription);
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
    return json(404, { error: { message: `Not implemented in the test stand-in: ${route}` } });
  } catch (error) {
    console.error(error);
    return json(500, { error: { message: String(error) } });
  }
});

server.listen(PORT, () => console.log(`Fake Stripe listening on http://localhost:${PORT}`));
