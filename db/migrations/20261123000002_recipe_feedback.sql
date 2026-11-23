-- Favorites and ratings drive how often a recipe is planned.
create table public.recipe_feedback (
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_slug text not null references public.recipes (slug) on delete cascade,
  favorite boolean not null default false,
  rating smallint check (rating between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, recipe_slug)
);

alter table public.recipe_feedback enable row level security;

create policy "manage own feedback" on public.recipe_feedback for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
