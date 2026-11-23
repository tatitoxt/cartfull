alter table public.profiles drop constraint profiles_diet_check;
alter table public.profiles add constraint profiles_diet_check
  check (diet in ('none', 'keto', 'low_carb', 'vegetarian', 'vegan', 'pescatarian', 'gluten_free', 'dairy_free', 'high_protein'));
