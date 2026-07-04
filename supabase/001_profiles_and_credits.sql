-- ============================================================
-- KellyIA — Table des profils, plans et crédits
-- À exécuter dans Supabase : SQL Editor → New query → coller → Run
-- ============================================================

-- 1. Table des profils (une ligne par utilisateur connecté)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  plan text not null default 'gratuit' check (plan in ('gratuit', 'plus')),
  credits_miniatures int not null default 5,
  credits_voice int not null default 3,
  credits_reset_at timestamptz not null default (now() + interval '1 month'),
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Chaque utilisateur ne peut lire QUE sa propre ligne
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- Aucune policy d'UPDATE/INSERT/DELETE côté client : toutes les
-- modifications passent par la fonction consume_credit() ci-dessous,
-- ou par le trigger de création automatique. C'est volontaire :
-- ça empêche un visiteur de se donner des crédits illimités lui-même.

-- 2. Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Fonction appelée à chaque génération (miniature ou voix)
-- Gère : renouvellement mensuel des crédits, rétrogradation automatique
-- si l'abonnement Plus a expiré, vérification + décompte du crédit.
create or replace function public.consume_credit(credit_type text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_limit_miniatures int;
  v_limit_voice int;
  v_ok boolean := false;
begin
  if v_user_id is null then
    return json_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_profile from public.profiles where id = v_user_id for update;
  if not found then
    return json_build_object('ok', false, 'error', 'profile_not_found');
  end if;

  -- Rétrograde automatiquement si l'abonnement Plus a expiré
  if v_profile.plan = 'plus'
     and v_profile.subscription_expires_at is not null
     and v_profile.subscription_expires_at < now() then
    v_profile.plan := 'gratuit';
  end if;

  if v_profile.plan = 'plus' then
    v_limit_miniatures := 50;
    v_limit_voice := 30;
  else
    v_limit_miniatures := 5;
    v_limit_voice := 3;
  end if;

  -- Renouvelle les crédits si la période mensuelle est écoulée
  if v_profile.credits_reset_at < now() then
    v_profile.credits_miniatures := v_limit_miniatures;
    v_profile.credits_voice := v_limit_voice;
    v_profile.credits_reset_at := now() + interval '1 month';
  end if;

  if credit_type = 'miniature' and v_profile.credits_miniatures > 0 then
    v_profile.credits_miniatures := v_profile.credits_miniatures - 1;
    v_ok := true;
  elsif credit_type = 'voice' and v_profile.credits_voice > 0 then
    v_profile.credits_voice := v_profile.credits_voice - 1;
    v_ok := true;
  end if;

  -- On sauvegarde toujours l'état (rétrogradation / renouvellement),
  -- même si le crédit demandé est refusé faute de solde.
  update public.profiles
  set plan = v_profile.plan,
      credits_miniatures = v_profile.credits_miniatures,
      credits_voice = v_profile.credits_voice,
      credits_reset_at = v_profile.credits_reset_at,
      updated_at = now()
  where id = v_user_id;

  if not v_ok then
    return json_build_object(
      'ok', false, 'error', 'no_credits',
      'plan', v_profile.plan,
      'credits_miniatures', v_profile.credits_miniatures,
      'credits_voice', v_profile.credits_voice
    );
  end if;

  return json_build_object(
    'ok', true,
    'plan', v_profile.plan,
    'credits_miniatures', v_profile.credits_miniatures,
    'credits_voice', v_profile.credits_voice
  );
end;
$$;

grant execute on function public.consume_credit(text) to authenticated;
