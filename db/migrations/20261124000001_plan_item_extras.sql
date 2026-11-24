-- Extras are catalog ingredients the household adds to a week by hand (wine,
-- dish soap, paper towels) that no recipe asked for. They live in plan_items
-- like any other row so checked/share/RLS behavior comes for free; save_plan
-- never deletes rows, so they survive regenerating the week.
alter table public.plan_items add column extra boolean not null default false;

-- The shared list ships extras too, flagged so the page can render them.
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
        'have_qty', i.have_qty,
        'extra', i.extra))
      from public.plan_items i
      where i.plan_id = p.id
        and (i.extra or exists (
          select 1 from public.plan_meals pm
          join public.recipe_ingredients ri on ri.recipe_slug = pm.recipe_slug
          where pm.plan_id = p.id and ri.ingredient_id = i.ingredient_id and not pm.leftover
        ))), '[]'::jsonb),
    'meals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', m.day, 'slot', m.slot, 'slug', m.recipe_slug, 'servings', m.servings,
        'leftover', m.leftover))
      from public.plan_meals m where m.plan_id = p.id), '[]'::jsonb)
  )
  from public.plan_shares s
  join public.plans p on p.id = s.plan_id
  left join public.profiles pr on pr.id = p.user_id
  where s.token = p_token and public.share_accessible(p.id);
$$;

-- A shared shopper can tick extras the same way they tick cart lines.
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
    where m.plan_id = v_plan and ri.ingredient_id = p_ingredient_id and not m.leftover
  ) and not exists (
    select 1 from public.plan_items x
    where x.plan_id = v_plan and x.ingredient_id = p_ingredient_id and x.extra
  ) then
    raise exception 'ingredient not on this list';
  end if;
  insert into public.plan_items (plan_id, ingredient_id, checked)
  values (v_plan, p_ingredient_id, p_checked)
  on conflict (plan_id, ingredient_id) do update set checked = excluded.checked;
end;
$$;

-- The new catalog rows also ship in the migration: databases upgraded through
--  alone (no seed re-run) still get the ingredients extras need for
-- the plan_items foreign key.
insert into public.ingredients (id, name, aisle, unit, pkg_qty, pkg_cents, pkg_label, kind, staple, spicy, allergens) values
  ('wine_red', 'Red wine', 'beverages', 'each', 1, 899, '25.4 oz bottle', 'other', false, false, '{}'::text[]),
  ('wine_white', 'White wine', 'beverages', 'each', 1, 899, '25.4 oz bottle', 'other', false, false, '{}'::text[]),
  ('beer', 'Beer', 'beverages', 'each', 1, 1299, '12 pack', 'other', false, false, array['gluten']::text[]),
  ('sparkling_water', 'Sparkling water', 'beverages', 'each', 1, 599, '12 pack', 'other', false, false, '{}'::text[]),
  ('orange_juice', 'Orange juice', 'beverages', 'each', 1, 449, '52 oz carton', 'other', false, false, '{}'::text[]),
  ('cola', 'Cola', 'beverages', 'each', 1, 799, '12 pack', 'other', false, false, '{}'::text[]),
  ('coffee_beans', 'Coffee', 'beverages', 'each', 1, 999, '12 oz bag', 'other', false, false, '{}'::text[]),
  ('tea_bags', 'Tea bags', 'beverages', 'each', 1, 449, '20 pack', 'other', false, false, '{}'::text[]),
  ('dish_soap', 'Dish soap', 'household', 'each', 1, 349, '25 oz bottle', 'other', false, false, '{}'::text[]),
  ('hand_soap', 'Hand soap', 'household', 'each', 1, 299, '8 oz bottle', 'other', false, false, '{}'::text[]),
  ('paper_towels', 'Paper towels', 'household', 'each', 1, 899, '6 pack', 'other', false, false, '{}'::text[]),
  ('toilet_paper', 'Toilet paper', 'household', 'each', 1, 1099, '12 pack', 'other', false, false, '{}'::text[]),
  ('laundry_detergent', 'Laundry detergent', 'household', 'each', 1, 1399, '100 oz bottle', 'other', false, false, '{}'::text[]),
  ('trash_bags', 'Trash bags', 'household', 'each', 1, 999, '45 pack', 'other', false, false, '{}'::text[]),
  ('sponges', 'Sponges', 'household', 'each', 1, 449, '6 pack', 'other', false, false, '{}'::text[]),
  ('all_purpose_cleaner', 'All-purpose cleaner', 'household', 'each', 1, 399, '28 oz bottle', 'other', false, false, '{}'::text[]),
  ('aluminum_foil', 'Aluminum foil', 'household', 'each', 1, 399, 'each', 'other', false, false, '{}'::text[]),
  ('plastic_wrap', 'Plastic wrap', 'household', 'each', 1, 349, 'each', 'other', false, false, '{}'::text[]),
  ('freezer_bags', 'Freezer bags', 'household', 'each', 1, 599, '30 pack', 'other', false, false, '{}'::text[]),
  ('batteries_aa', 'AA batteries', 'household', 'each', 1, 799, '8 pack', 'other', false, false, '{}'::text[]),
  ('light_bulbs', 'LED light bulbs', 'household', 'each', 1, 999, '4 pack', 'other', false, false, '{}'::text[]),
  ('bleach', 'Bleach', 'household', 'each', 1, 329, '64 oz bottle', 'other', false, false, '{}'::text[])
on conflict (id) do update set name = excluded.name, aisle = excluded.aisle, unit = excluded.unit,
  pkg_qty = excluded.pkg_qty, pkg_cents = excluded.pkg_cents, pkg_label = excluded.pkg_label,
  kind = excluded.kind, staple = excluded.staple, spicy = excluded.spicy, allergens = excluded.allergens;

-- The saved estimate counts every visible extra once: on regeneration the
-- stored total becomes meal cart + hand-added items (an extra that a meal
-- also needs is already priced in the cart, so it is not counted twice).
create or replace function public.save_plan(
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
  insert into public.plan_meals (plan_id, day, slot, recipe_slug, servings, leftover)
  select pid, (m ->> 'day')::smallint, m ->> 'slot', m ->> 'recipe_slug', (m ->> 'servings')::integer,
         coalesce((m ->> 'leftover')::boolean, false)
  from jsonb_array_elements(p_meals) m;

  -- No prune: rows for ingredients off the cart are invisible (every view
  -- derives the list from the cart) and keep their checked/have state for
  -- when the meal comes back, e.g. a leftovers flag toggled off again.
  -- The cart line already carries the merged have/have_qty state, so update
  -- it on conflict; `checked` (the bought tick) always survives. have_qty is
  -- capped at the week's need by buildCart, so keep the larger saved stock:
  -- manual stock edits go through plan_items directly, never through here.
  insert into public.plan_items (plan_id, ingredient_id, have, have_qty)
  select pid, i ->> 'ingredient_id', coalesce((i ->> 'have')::boolean, false),
         coalesce((i ->> 'have_qty')::numeric, 0)
  from jsonb_array_elements(p_items) i
  on conflict (plan_id, ingredient_id) do update
    set have = excluded.have, have_qty = greatest(public.plan_items.have_qty, excluded.have_qty);

  update public.plans
  set total_cents = p_total_cents + coalesce((
    select sum(g.pkg_cents)
    from public.plan_items x
    join public.ingredients g on g.id = x.ingredient_id
    where x.plan_id = pid and x.extra
      and not exists (
        select 1 from jsonb_array_elements(p_items) i
        where i ->> 'ingredient_id' = x.ingredient_id)), 0)
  where id = pid;

  return pid;
end;
$$;

revoke execute on function public.save_plan(date, integer, integer, integer, text, integer, integer, jsonb, jsonb) from public, anon;
grant execute on function public.save_plan(date, integer, integer, integer, text, integer, integer, jsonb, jsonb) to authenticated;

-- The shared list never needed row-level reads: the page reads through the
-- token-checked shared_plan function and ticks through check_shared_item.
-- The old policy let ANY signed-in or anonymous caller read a plan's items
-- whenever a share link existed — extras made that leak include personal
-- purchases, so the policy and its helper are removed. Shared views poll
-- the RPC for updates instead of subscribing to plan_items.
drop policy if exists "shared plans' items are readable through a link" on public.plan_items;
drop function if exists public.plan_item_share_visible(uuid);

-- Atomic estimate bumps: add/removeExtraItem adjust the saved total instead
-- of rewriting it from a possibly stale snapshot, so two tabs adding extras
-- can't lose each other's cost.
create or replace function public.adjust_plan_total(p_plan_id uuid, p_delta integer) returns void
language sql security invoker set search_path = '' as $$
  update public.plans set total_cents = total_cents + p_delta where id = p_plan_id;
$$;

revoke execute on function public.adjust_plan_total(uuid, integer) from public, anon;
grant execute on function public.adjust_plan_total(uuid, integer) to authenticated;
