-- Billing moves from Stripe to Polar. The columns only ever store provider
-- ids, so they get provider-neutral names. No subscriber data exists yet.
alter table public.subscriptions rename column stripe_customer_id to billing_customer_id;
alter table public.subscriptions rename column stripe_subscription_id to billing_subscription_id;
alter table public.stripe_events rename to billing_events;
