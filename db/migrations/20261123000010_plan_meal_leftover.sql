-- A meal marked leftover stays on the plan but shops nothing: the household
-- eats what is already cooked, so its ingredients leave the cart.
alter table public.plan_meals add column leftover boolean not null default false;

-- save_plan persists the new flag; everything else stays the same.
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
  -- it on conflict; `checked` (the bought tick) always survives.
  insert into public.plan_items (plan_id, ingredient_id, have, have_qty)
  select pid, i ->> 'ingredient_id', coalesce((i ->> 'have')::boolean, false),
         coalesce((i ->> 'have_qty')::numeric, 0)
  from jsonb_array_elements(p_items) i
  on conflict (plan_id, ingredient_id) do update
    set have = excluded.have, have_qty = excluded.have_qty;

  return pid;
end;
$$;

revoke execute on function public.save_plan(date, integer, integer, integer, text, integer, integer, jsonb, jsonb) from public, anon;
grant execute on function public.save_plan(date, integer, integer, integer, text, integer, integer, jsonb, jsonb) to authenticated;

-- The shared list must hide leftovers too: shared_plan ships the flag so the
-- page's buildCart skips those meals, and check_shared_item refuses to tick
-- an ingredient that only exists in a leftover meal.
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
      from public.plan_items i
      where i.plan_id = p.id
        and exists (
          select 1 from public.plan_meals pm
          join public.recipe_ingredients ri on ri.recipe_slug = pm.recipe_slug
          where pm.plan_id = p.id and ri.ingredient_id = i.ingredient_id and not pm.leftover
        )), '[]'::jsonb),
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
  ) then
    raise exception 'ingredient not on this list';
  end if;
  insert into public.plan_items (plan_id, ingredient_id, checked)
  values (v_plan, p_ingredient_id, p_checked)
  on conflict (plan_id, ingredient_id) do update set checked = excluded.checked;
end;
$$;
