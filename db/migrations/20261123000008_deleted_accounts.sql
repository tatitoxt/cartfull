-- Emails that deleted their account, so a re-registration doesn't get a second
-- first-time trial. Written by the service role during deleteAccount.
create table public.deleted_accounts (
  email text primary key,
  deleted_at timestamptz not null default now()
);

alter table public.deleted_accounts enable row level security;
-- No policies: only the service role may read or write this table.
