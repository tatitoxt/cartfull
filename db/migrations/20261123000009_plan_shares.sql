-- Live share links for the grocery list: whoever has the link can tick items
-- off without an account (the WhatsApp-to-the-shopper case).
create table public.plan_shares (
  token uuid primary key default gen_random_uuid(),
  plan_id uuid not null unique references public.plans (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.plan_shares enable row level security;
-- No table policies: owners reach it through create_plan_share, readers through
-- the token-gated RPCs below.

-- Same rule as can_view_plan, but evaluated for the plan's owner: share-link
-- callers are anonymous, so the auth.uid() checks inside has_access /
-- first_plan_id cannot be reused. When a subscription ends, its links die too.
create function public.share_accessible(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.plans p
    where p.id = pid
      and (
        exists (
          select 1 from public.subscriptions s
          where s.user_id = p.user_id and s.status in ('trialing', 'active')
        )
        or p.id = (
          select fp.id from public.plans fp
          where fp.user_id = p.user_id
          order by fp.created_at, fp.id limit 1
        )
      )
  );
$$;

-- Called by the plan owner; idempotent (one token per plan). can_view_plan
-- already proves ownership and that the week is not paywalled.
create or replace function public.create_plan_share(p_plan_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_token uuid;
begin
  if auth.uid() is null or not public.can_view_plan(p_plan_id) then
    raise exception 'plan not found';
  end if;
  insert into public.plan_shares (plan_id) values (p_plan_id)
  on conflict (plan_id) do update set plan_id = excluded.plan_id
  returning token into v_token;
  return v_token;
end;
$$;

-- Everything a shared view needs to rebuild the cart: meals, item states, and
-- the owner's locale so the shopper sees the same language and units.
create or replace function public.shared_plan(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'plan_id', p.id,
    'week_start', p.week_start,
    'budget_cents', p.budget_cents,
    'lang', coalesce(pr.lang, 'en'),
    'units', coalesce(pr.units, 'imperial'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ingredient_id', i.ingredient_id,
        'checked', i.checked,
        'have', i.have,
        'have_qty', i.have_qty))
      from public.plan_items i where i.plan_id = p.id), '[]'::jsonb),
    'meals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', m.day, 'slot', m.slot, 'slug', m.recipe_slug, 'servings', m.servings))
      from public.plan_meals m where m.plan_id = p.id), '[]'::jsonb)
  )
  from public.plan_shares s
  join public.plans p on p.id = s.plan_id
  left join public.profiles pr on pr.id = p.user_id
  where s.token = p_token and public.share_accessible(p.id);
$$;

-- Same rule as can_edit_plan, evaluated for the plan's owner: ticking items is
-- a write, so a link must stop working when the owner's free week locks, not
-- just when viewing does.
create or replace function public.share_editable(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.plans p
    where p.id = pid
      and (
        exists (
          select 1 from public.subscriptions s
          where s.user_id = p.user_id and s.status in ('trialing', 'active')
        )
        or (
          p.id = (
            select fp.id from public.plans fp
            where fp.user_id = p.user_id
            order by fp.created_at, fp.id limit 1
          )
          and current_date < p.week_start + 7
        )
      )
  );
$$;

-- Shared viewers may only tick bought items, and only ones actually on this
-- list (a stray check could pre-tick an ingredient a later swap adds).
-- "Have at home" stays owner-only.
create or replace function public.check_shared_item(p_token uuid, p_ingredient_id text, p_checked boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_plan uuid;
begin
  select s.plan_id into v_plan
  from public.plan_shares s
  where s.token = p_token and public.share_accessible(s.plan_id);
  if v_plan is null then
    raise exception 'invalid share link';
  end if;
  if not public.share_editable(v_plan) then
    raise exception 'list is locked';
  end if;
  if not exists (
    select 1
    from public.plan_meals m
    join public.recipe_ingredients ri on ri.recipe_slug = m.recipe_slug
    where m.plan_id = v_plan and ri.ingredient_id = p_ingredient_id
  ) then
    raise exception 'ingredient not on this list';
  end if;
  insert into public.plan_items (plan_id, ingredient_id, checked)
  values (v_plan, p_ingredient_id, p_checked)
  on conflict (plan_id, ingredient_id) do update set checked = excluded.checked;
end;
$$;

revoke all on function public.share_accessible(uuid) from public, anon;
revoke all on function public.create_plan_share(uuid) from public, anon;
grant execute on function public.create_plan_share(uuid) to authenticated;
grant execute on function public.shared_plan(uuid) to anon, authenticated;
grant execute on function public.check_shared_item(uuid, text, boolean) to anon, authenticated;

-- Realtime ticks: both sides of the list see checkmarks as they happen. The
-- read policy keeps item rows of shared plans visible to link holders (the
-- plan id is an unguessable uuid).
do $$
begin
  alter publication supabase_realtime add table public.plan_items;
exception when undefined_object then null;
end $$;

alter table public.plan_items replica identity full;

-- Policy expressions run as the caller, so they cannot see plan_shares (no
-- policies on it). A definer function both reads it and applies the expiry
-- rule, so realtime ticks reach link holders only while access is live.
create function public.plan_item_share_visible(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.plan_shares s
    where s.plan_id = pid and public.share_accessible(s.plan_id)
  );
$$;

-- The caller role needs EXECUTE on functions inside policy expressions; both
-- helpers return only booleans.
grant execute on function public.plan_item_share_visible(uuid) to anon, authenticated;
-- The existing "read items of a viewable plan" policy calls can_view_plan, so
-- anon selects on plan_items need EXECUTE on it too (it returns false for anon).
grant execute on function public.can_view_plan(uuid) to anon;

create policy "shared plans' items are readable through a link"
  on public.plan_items for select to anon, authenticated
  using (public.plan_item_share_visible(plan_id));
