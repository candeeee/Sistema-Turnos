-- ===========================================================================
-- 04 · Storage y bootstrap de administradores
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Bucket de imágenes de servicios
-- ---------------------------------------------------------------------------
-- Público en lectura (las imágenes se muestran en el sitio y se sirven por
-- CDN, sin firmar URLs en cada render) y escribible solo por administradores.
-- El límite de tamaño y los tipos permitidos se aplican en el servidor: no
-- alcanza con validar el input file en el navegador.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'services',
  'services',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "service_images_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'services');

create policy "service_images_insert_admin"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'services' and public.is_admin());

create policy "service_images_update_admin"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'services' and public.is_admin())
  with check (bucket_id = 'services' and public.is_admin());

create policy "service_images_delete_admin"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'services' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Crear el primer administrador
-- ---------------------------------------------------------------------------
-- Problema del huevo y la gallina: solo un admin puede nombrar a otro admin,
-- y al principio no hay ninguno. Esta función se ejecuta con service_role
-- (SQL Editor de Supabase o el script npm), nunca desde la aplicación.
--
--   select public.promote_to_admin('dueño@negocio.com');

create or replace function public.promote_to_admin(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower(trim(p_email));

  if v_user_id is null then
    raise exception 'No existe un usuario con el email %. Registralo primero desde /registro.', p_email
      using errcode = 'P0002';
  end if;

  update public.profiles set role = 'admin' where id = v_user_id;

  return format('%s ahora es administrador.', p_email);
end;
$$;

revoke execute on function public.promote_to_admin(text) from public, anon, authenticated;
grant execute on function public.promote_to_admin(text) to service_role;
