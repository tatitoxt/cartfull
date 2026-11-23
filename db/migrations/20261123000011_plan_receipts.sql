-- Receipt photo attached to a week, kept in the database (no storage bucket):
-- it inherits the plan's visibility rules through RLS like every other table.

create table public.plan_receipts (
  plan_id uuid primary key references public.plans (id) on delete cascade,
  image bytea not null check (octet_length(image) between 1 and 6291456),
  mime text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'image/heic')),
  uploaded_at timestamptz not null default now()
);

alter table public.plan_receipts enable row level security;

-- Same visibility as the week itself: a receipt can be attached wherever the
-- plan is viewable (matching record_spend), and never escapes the owner.
create policy "read receipt of a viewable plan" on public.plan_receipts for select
  using (public.can_view_plan(plan_id));
create policy "attach receipt to a viewable plan" on public.plan_receipts for insert
  with check (public.can_view_plan(plan_id));
create policy "replace receipt of a viewable plan" on public.plan_receipts for update
  using (public.can_view_plan(plan_id)) with check (public.can_view_plan(plan_id));
create policy "remove receipt of a viewable plan" on public.plan_receipts for delete
  using (public.can_view_plan(plan_id));

grant select, insert, update, delete on public.plan_receipts to authenticated;
grant all on public.plan_receipts to service_role;
