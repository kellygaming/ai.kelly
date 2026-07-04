-- ============================================================
-- KellyIA — Réduction des limites (meilleure marge)
-- À exécuter dans Supabase : SQL Editor → New query → coller → Run
-- (à exécuter APRÈS 001 et 002)
-- ============================================================

create or replace function public.consume_credit(credit_type text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_limit_chat int;
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

  if v_profile.plan = 'plus'
     and v_profile.subscription_expires_at is not null
     and v_profile.subscription_expires_at < now() then
    v_profile.plan := 'gratuit';
  end if;

  if v_profile.plan = 'plus' then
    v_limit_chat := 300;
    v_limit_miniatures := 12;
    v_limit_voice := 8;
  else
    v_limit_chat := 20;
    v_limit_miniatures := 3;
    v_limit_voice := 2;
  end if;

  if v_profile.credits_reset_at < now() then
    v_profile.credits_chat := v_limit_chat;
    v_profile.credits_miniatures := v_limit_miniatures;
    v_profile.credits_voice := v_limit_voice;
    v_profile.credits_reset_at := now() + interval '1 month';
  end if;

  if credit_type = 'chat' and v_profile.credits_chat > 0 then
    v_profile.credits_chat := v_profile.credits_chat - 1;
    v_ok := true;
  elsif credit_type = 'miniature' and v_profile.credits_miniatures > 0 then
    v_profile.credits_miniatures := v_profile.credits_miniatures - 1;
    v_ok := true;
  elsif credit_type = 'voice' and v_profile.credits_voice > 0 then
    v_profile.credits_voice := v_profile.credits_voice - 1;
    v_ok := true;
  end if;

  update public.profiles
  set plan = v_profile.plan,
      credits_chat = v_profile.credits_chat,
      credits_miniatures = v_profile.credits_miniatures,
      credits_voice = v_profile.credits_voice,
      credits_reset_at = v_profile.credits_reset_at,
      updated_at = now()
  where id = v_user_id;

  if not v_ok then
    return json_build_object(
      'ok', false, 'error', 'no_credits',
      'plan', v_profile.plan,
      'credits_chat', v_profile.credits_chat,
      'credits_miniatures', v_profile.credits_miniatures,
      'credits_voice', v_profile.credits_voice
    );
  end if;

  return json_build_object(
    'ok', true,
    'plan', v_profile.plan,
    'credits_chat', v_profile.credits_chat,
    'credits_miniatures', v_profile.credits_miniatures,
    'credits_voice', v_profile.credits_voice
  );
end;
$$;

grant execute on function public.consume_credit(text) to authenticated;
