begin;
-- Execute uma vez em um projeto novo.
create table public.admins(id uuid primary key references auth.users(id) on delete cascade);
create table public.students(id uuid primary key default gen_random_uuid(), email text unique not null, data jsonb not null, created_at timestamptz default now());
create table public.classes(id uuid primary key default gen_random_uuid(), starts_at timestamptz not null, capacity integer not null check(capacity>0), data jsonb not null, created_at timestamptz default now());
create table public.bookings(id uuid primary key default gen_random_uuid(), class_id uuid not null references public.classes on delete cascade, student_id uuid not null references public.students on delete cascade, status text not null check(status in ('Reservado','Presente','Falta','Cancelado')), unique(class_id,student_id));
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.admins where id=auth.uid()) $$;
create function public.owns_student(s uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.students where id=s and email=lower(auth.jwt()->>'email')) $$;
alter table public.admins enable row level security;
create policy own_admin on public.admins for select to authenticated using(id=auth.uid());
alter table public.students enable row level security;
create policy admin_students on public.students for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy own_students on public.students for select to authenticated using(public.owns_student(id));
alter table public.classes enable row level security;
create policy admin_classes on public.classes for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy read_classes on public.classes for select to authenticated using(true);
alter table public.bookings enable row level security;
create policy admin_bookings on public.bookings for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy own_bookings on public.bookings for select to authenticated using(public.owns_student(student_id));
do $$ declare t text; begin foreach t in array array['workouts','assessments','finance','recovery'] loop
execute format('create table public.%I(id uuid primary key default gen_random_uuid(), student_id uuid references public.students on delete cascade, data jsonb not null, created_at timestamptz default now())',t);
execute format('alter table public.%I enable row level security',t);
execute format('create policy admin_all on public.%I for all to authenticated using(public.is_admin()) with check(public.is_admin())',t);
execute format('create policy own_read on public.%I for select to authenticated using(public.owns_student(student_id))',t);
end loop; end $$;
create policy own_recovery on public.recovery for insert to authenticated with check(public.owns_student(student_id));
create function public.manage_booking(class_key uuid, action text) returns void language plpgsql security definer set search_path='' as $$
declare s uuid; c public.classes%rowtype; b public.bookings%rowtype;
begin
select id into s from public.students where email=lower(auth.jwt()->>'email') and data->>'status'='Ativo';
if s is null then raise exception 'Cadastro ativo necessário'; end if;
select * into c from public.classes where id=class_key for update;
if not found then raise exception 'Aula não encontrada'; end if;
select * into b from public.bookings where class_id=class_key and student_id=s;
if action='reserve' then
if now()>=c.starts_at then raise exception 'Aula já iniciada'; end if;
if b.status in ('Reservado','Presente') then return; end if;
if (select count(*) from public.bookings where class_id=class_key and status<>'Cancelado')>=c.capacity then raise exception 'Turma lotada'; end if;
insert into public.bookings(class_id,student_id,status) values(class_key,s,'Reservado') on conflict(class_id,student_id) do update set status='Reservado';
elsif action='cancel' then
if now()>c.starts_at-interval '45 minutes' or b.status is distinct from 'Reservado' then raise exception 'Cancelamento indisponível'; end if;
update public.bookings set status='Cancelado' where id=b.id;
elsif action='checkin' then
if now()>c.starts_at-interval '30 minutes' or b.status is distinct from 'Reservado' then raise exception 'Check-in indisponível'; end if;
if not exists(select 1 from public.recovery where student_id=s and created_at>=date_trunc('day',now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo') then raise exception 'Preencha o Recovery de hoje'; end if;
update public.bookings set status='Presente' where id=b.id;
else raise exception 'Ação inválida'; end if;
end $$;
revoke all on function public.manage_booking(uuid,text) from public;
grant execute on function public.manage_booking(uuid,text) to authenticated;

-- Permissões explícitas para Data API, mantendo RLS.
grant usage on schema public to authenticated;
grant select on public.admins to authenticated;
grant select, insert, update, delete on public.students, public.classes, public.bookings, public.workouts, public.assessments, public.finance, public.recovery to authenticated;
commit;
