-- Partial "already at home" quantities: have_qty counts units of the cart line
-- the household owns; at full quantity the line behaves like have = true.
alter table public.plan_items
  add column have_qty numeric not null default 0;

comment on column public.plan_items.have_qty is
  'Units of the cart line already at home, in the ingredient''s unit; full ownership keeps have = true.';
