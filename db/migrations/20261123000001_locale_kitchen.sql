-- Where the household cooks (sets language and units), which appliances it has,
-- and which reminders it asked for.
alter table public.profiles
  add column country text not null default 'US' check (country ~ '^[A-Z_]{2,8}$'),
  add column lang text not null default 'en' check (lang in ('en', 'es')),
  add column units text not null default 'imperial' check (units in ('imperial', 'metric')),
  add column equipment text[] not null default '{stovetop,oven,microwave}',
  add column notify_plan boolean not null default false,
  add column notify_shopping boolean not null default false,
  add column notify_receipt boolean not null default false;
