-- Cartfull schema: recipe catalog, households, weekly plans, subscriptions.
-- Every table has row level security enabled.

-- ---------------------------------------------------------------------------
-- Catalog (public read, no client writes)
-- ---------------------------------------------------------------------------
create table public.ingredients (
  id text primary key,
  name text not null,
  aisle text not null,
  unit text not null,
  pkg_qty numeric not null check (pkg_qty > 0),
  pkg_cents integer not null check (pkg_cents > 0),
  pkg_label text not null,
  kind text not null,
  staple boolean not null default false,
  spicy boolean not null default false,
  allergens text[] not null default '{}'
);

create table public.recipes (
  slug text primary key,
  name text not null,
  meal_type text not null check (meal_type in ('dinner', 'lunch', 'breakfast')),
  diet_tags text[] not null default '{}',
  servings integer not null check (servings between 1 and 8),
  prep_minutes integer not null check (prep_minutes > 0),
  batch_friendly boolean not null default false,
  description text not null,
  steps text[] not null,
  photo_url text not null,
  photo_credit_name text not null,
  photo_credit_url text not null,
  active boolean not null default true
);

create table public.recipe_ingredients (
  recipe_slug text not null references public.recipes (slug) on delete cascade,
  ingredient_id text not null references public.ingredients (id),
  qty numeric not null check (qty > 0),
  note text,
  position integer not null default 0,
  primary key (recipe_slug, ingredient_id)
);

alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

create policy "catalog is readable by everyone" on public.ingredients for select using (true);
create policy "catalog is readable by everyone" on public.recipes for select using (true);
create policy "catalog is readable by everyone" on public.recipe_ingredients for select using (true);

-- ---------------------------------------------------------------------------
-- Households
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  weekly_budget_cents integer check (weekly_budget_cents between 1000 and 200000),
  usual_spend_cents integer check (usual_spend_cents between 1000 and 300000),
  household_size integer not null default 2 check (household_size between 1 and 8),
  diet text not null default 'none' check (diet in ('none', 'keto', 'vegetarian', 'high_protein')),
  cook_time text not null default 'normal' check (cook_time in ('fast', 'normal', 'batch')),
  include_breakfast boolean not null default false,
  include_lunch boolean not null default false,
  allergens text[] not null default '{}',
  dislikes text[] not null default '{}',
  onboarded_at timestamptz,
  utm jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.pantry_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  ingredient_id text not null references public.ingredients (id) on delete cascade,
  primary key (user_id, ingredient_id)
);

alter table public.profiles enable row level security;
alter table public.pantry_items enable row level security;

create policy "read own profile" on public.profiles for select using (id = (select auth.uid()));
create policy "update own profile" on public.profiles for update
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "manage own pantry" on public.pantry_items for all
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Subscriptions (written only by the Stripe webhook with the service role)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'none',
  price_id text,
  billing_interval text,
  trial_end timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;
alter table public.stripe_events enable row level security;

create policy "read own subscription" on public.subscriptions for select
  using (user_id = (select auth.uid()));
-- No insert/update/delete policies: clients can never grant themselves access.

create function public.has_access(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = uid and s.status in ('trialing', 'active')
  );
$$;

-- ---------------------------------------------------------------------------
-- Weekly plans
-- ---------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  budget_cents integer not null check (budget_cents > 0),
  usual_spend_cents integer,
  household_size integer not null check (household_size between 1 and 8),
  diet text not null,
  total_cents integer not null check (total_cents >= 0),
  seed integer not null default 0,
  spent_cents integer check (spent_cents >= 0),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table public.plan_meals (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  day smallint not null check (day between 0 and 6),
  slot text not null check (slot in ('dinner', 'lunch', 'breakfast')),
  recipe_slug text not null references public.recipes (slug),
  servings integer not null check (servings between 1 and 16),
  unique (plan_id, day, slot)
);

create table public.plan_items (
  plan_id uuid not null references public.plans (id) on delete cascade,
  ingredient_id text not null references public.ingredients (id),
  checked boolean not null default false,
  have boolean not null default false,
  primary key (plan_id, ingredient_id)
);

create index plan_meals_plan_idx on public.plan_meals (plan_id);
create index plans_user_week_idx on public.plans (user_id, week_start desc);

-- The first plan a household ever created is theirs to keep for free.
create function public.first_plan_id(uid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select p.id from public.plans p where p.user_id = uid order by p.created_at, p.id limit 1;
$$;

-- Viewing: the free first week stays readable; everything else needs a subscription.
create function public.can_view_plan(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.plans p
    where p.id = pid
      and p.user_id = (select auth.uid())
      and (public.has_access(p.user_id) or p.id = public.first_plan_id(p.user_id))
  );
$$;

-- Editing (regenerate, swap, check off): subscribers always; the free first week
-- only until that week is over, so it cannot be reshuffled forever.
create function public.can_edit_plan(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.plans p
    where p.id = pid
      and p.user_id = (select auth.uid())
      and (
        public.has_access(p.user_id)
        or (p.id = public.first_plan_id(p.user_id) and current_date < p.week_start + 7)
      )
  );
$$;

alter table public.plans enable row level security;
alter table public.plan_meals enable row level security;
alter table public.plan_items enable row level security;

create policy "read own plans" on public.plans for select using (user_id = (select auth.uid()));

-- Week one is free; every later week needs a trialing or active subscription.
create policy "create plan when entitled" on public.plans for insert
  with check (
    user_id = (select auth.uid())
    and week_start <= current_date + 14
    and (
      public.has_access((select auth.uid()))
      or public.first_plan_id((select auth.uid())) is null
    )
  );

create policy "update own editable plan" on public.plans for update
  using (public.can_edit_plan(id)) with check (user_id = (select auth.uid()));
-- No delete policy: deleting the free week and starting over is not allowed.

create policy "read meals of a viewable plan" on public.plan_meals for select
  using (public.can_view_plan(plan_id));
create policy "add meals to an editable plan" on public.plan_meals for insert
  with check (public.can_edit_plan(plan_id));
create policy "change meals of an editable plan" on public.plan_meals for update
  using (public.can_edit_plan(plan_id)) with check (public.can_edit_plan(plan_id));
create policy "remove meals of an editable plan" on public.plan_meals for delete
  using (public.can_edit_plan(plan_id));

create policy "read items of a viewable plan" on public.plan_items for select
  using (public.can_view_plan(plan_id));
create policy "add items to an editable plan" on public.plan_items for insert
  with check (public.can_edit_plan(plan_id));
create policy "change items of an editable plan" on public.plan_items for update
  using (public.can_edit_plan(plan_id)) with check (public.can_edit_plan(plan_id));
create policy "remove items of an editable plan" on public.plan_items for delete
  using (public.can_edit_plan(plan_id));

-- Writes a week in one transaction: the plan row, its meals and its cart items.
-- Runs as the caller, so every policy above still applies.
create function public.save_plan(
  p_week_start date,
  p_budget_cents integer,
  p_usual_spend_cents integer,
  p_household_size integer,
  p_diet text,
  p_total_cents integer,
  p_seed integer,
  p_meals jsonb,
  p_items jsonb
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  pid uuid;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select id into pid from public.plans where user_id = uid and week_start = p_week_start;

  if pid is null then
    insert into public.plans (user_id, week_start, budget_cents, usual_spend_cents, household_size, diet, total_cents, seed)
    values (uid, p_week_start, p_budget_cents, p_usual_spend_cents, p_household_size, p_diet, p_total_cents, p_seed)
    returning id into pid;
  else
    update public.plans
    set budget_cents = p_budget_cents, usual_spend_cents = p_usual_spend_cents,
        household_size = p_household_size, diet = p_diet, total_cents = p_total_cents, seed = p_seed
    where id = pid;
    if not found then
      raise exception 'plan is not editable' using errcode = '42501';
    end if;
  end if;

  delete from public.plan_meals where plan_id = pid;
  insert into public.plan_meals (plan_id, day, slot, recipe_slug, servings)
  select pid, (m ->> 'day')::smallint, m ->> 'slot', m ->> 'recipe_slug', (m ->> 'servings')::integer
  from jsonb_array_elements(p_meals) m;

  delete from public.plan_items
  where plan_id = pid
    and ingredient_id not in (select i ->> 'ingredient_id' from jsonb_array_elements(p_items) i);
  insert into public.plan_items (plan_id, ingredient_id, have)
  select pid, i ->> 'ingredient_id', coalesce((i ->> 'have')::boolean, false)
  from jsonb_array_elements(p_items) i
  on conflict (plan_id, ingredient_id) do nothing;

  return pid;
end;
$$;

-- Recording what a week really cost is allowed on any week the household can
-- still see, including the free first week after it has ended.
create function public.record_spend(p_plan_id uuid, p_spent_cents integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_spent_cents is not null and (p_spent_cents < 0 or p_spent_cents > 500000) then
    raise exception 'spend out of range' using errcode = '22003';
  end if;
  if not public.can_view_plan(p_plan_id) then
    raise exception 'plan is not available' using errcode = '42501';
  end if;
  update public.plans
  set spent_cents = p_spent_cents,
      closed_at = case when p_spent_cents is null then null else now() end
  where id = p_plan_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on public.ingredients, public.recipes, public.recipe_ingredients to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (
  weekly_budget_cents, usual_spend_cents, household_size, diet, cook_time,
  include_breakfast, include_lunch, allergens, dislikes, onboarded_at, utm
) on public.profiles to authenticated;
grant select, insert, delete on public.pantry_items to authenticated;
grant select, insert on public.plans to authenticated;
-- week_start, user_id and created_at can never be rewritten by a client.
grant update (
  budget_cents, usual_spend_cents, household_size, diet, total_cents, seed
) on public.plans to authenticated;
grant select, insert, update, delete on public.plan_meals, public.plan_items to authenticated;
grant select on public.subscriptions to authenticated;
grant all on all tables in schema public to service_role;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function
  public.has_access(uuid), public.first_plan_id(uuid), public.can_view_plan(uuid), public.can_edit_plan(uuid)
  from public, anon;
grant execute on function
  public.has_access(uuid), public.first_plan_id(uuid), public.can_view_plan(uuid), public.can_edit_plan(uuid)
  to authenticated, service_role;
revoke execute on function public.save_plan(date, integer, integer, integer, text, integer, integer, jsonb, jsonb) from public, anon;
grant execute on function public.save_plan(date, integer, integer, integer, text, integer, integer, jsonb, jsonb) to authenticated;
revoke execute on function public.record_spend(uuid, integer) from public, anon;
grant execute on function public.record_spend(uuid, integer) to authenticated;
