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

  delete from public.plan_items
  where plan_id = pid
    and ingredient_id not in (select i ->> 'ingredient_id' from jsonb_array_elements(p_items) i);

  insert into public.plan_items (plan_id, ingredient_id, have, have_qty)
  select pid, i ->> 'ingredient_id', coalesce((i ->> 'have')::boolean, false),
         coalesce((i ->> 'have_qty')::numeric, 0)
  from jsonb_array_elements(p_items) i
  on conflict (plan_id, ingredient_id) do nothing;

  return pid;
end;
$$;

revoke execute on function public.save_plan(date, integer, integer, integer, text, integer, integer, jsonb, jsonb) from public, anon;
grant execute on function public.save_plan(date, integer, integer, integer, text, integer, integer, jsonb, jsonb) to authenticated;
