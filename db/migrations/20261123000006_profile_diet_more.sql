alter table public.profiles drop constraint profiles_diet_check;
alter table public.profiles add constraint profiles_diet_check
  check (diet in ('none', 'keto', 'vegetarian', 'vegan', 'pescatarian', 'gluten_free', 'high_protein'));
