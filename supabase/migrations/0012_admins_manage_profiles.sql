-- Engcore Ltd — un administrateur peut enfin valider un compte.
--
-- La table des profils portait trois politiques : lire le sien, lire tous
-- quand on est administrateur, et modifier le sien. Aucune ne permettait à un
-- administrateur de modifier le profil d'un autre.
--
-- Conséquence : « Valider le compte » dans le back-office partait, la base
-- écartait la ligne sans rien dire — une policy qui ne correspond pas ne
-- lève pas d'erreur, elle réduit simplement l'ensemble à zéro ligne — et
-- l'écran se rechargeait identique. La validation manuelle des comptes, qui
-- est pourtant la raison d'être de l'écran, n'a jamais rien validé.
--
-- Le garde-fou `prevent_role_change` reste en place et continue de protéger
-- l'essentiel : il n'annule les changements de rôle et de statut que pour les
-- non-administrateurs. Un client ne peut donc toujours pas se valider
-- lui-même, ni se promouvoir.

drop policy if exists "Admins update any profile" on public.profiles;
create policy "Admins update any profile" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- Même angle mort pour la suppression : un compte créé par erreur, ou un
-- doublon, ne pouvait pas être retiré depuis le back-office.
drop policy if exists "Admins delete a profile" on public.profiles;
create policy "Admins delete a profile" on public.profiles
  for delete using (public.is_admin());
