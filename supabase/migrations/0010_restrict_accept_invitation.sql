-- Engcore Ltd — `accept_invitation` réservée aux comptes connectés.
--
-- Même omission qu'à la migration 0008 : Postgres accorde `execute` à
-- `public` sur toute fonction nouvellement créée, et un `grant` ne retire
-- rien. La fonction rend `false` sans session — elle ne divulgue donc rien et
-- n'écrit rien — mais elle n'a aucune raison d'être appelable sans compte.
--
-- `invitation_details`, elle, reste ouverte : c'est le formulaire
-- d'inscription qui l'appelle, avant toute connexion.

revoke execute on function public.accept_invitation(text) from public;
revoke execute on function public.accept_invitation(text) from anon;
grant execute on function public.accept_invitation(text) to authenticated;
