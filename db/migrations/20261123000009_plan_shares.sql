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

-- Called by the plan owner; idempotent (one token per plan).
create or replace function public.create_plan_share(p_plan_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_token uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.plans where id = p_plan_id and user_id = auth.uid()
  ) then
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
  where s.token = p_token;
$$;

-- Shared viewers may only tick bought items; "have at home" stays owner-only.
create or replace function public.check_shared_item(p_token uuid, p_ingredient_id text, p_checked boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_plan uuid;
begin
  select s.plan_id into v_plan from public.plan_shares s where s.token = p_token;
  if v_plan is null then
    raise exception 'invalid share link';
  end if;
  insert into public.plan_items (plan_id, ingredient_id, checked)
  values (v_plan, p_ingredient_id, p_checked)
  on conflict (plan_id, ingredient_id) do update set checked = excluded.checked;
end;
$$;

revoke all on function public.create_plan_share(uuid) from public, anon;
grant execute on function public.create_plan_share(uuid) to authenticated;
grant execute on function public.shared_plan(uuid) to anon, authenticated;
grant execute on function public.check_shared_item(uuid, text, boolean) to anon, authenticated;
