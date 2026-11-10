create table public.miembros (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  created_at timestamptz not null default now()
);
create table public.citas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  hora time not null,
  miembro_id uuid references public.miembros(id) on delete set null,
  clienta text not null default '',
  servicio text not null,
  valor numeric not null default 0,
  porcentaje integer not null default 0,
  producto numeric not null default 0,
  estado text not null default 'pendiente',
  metodo_pago text,
  ganancia numeric,
  created_at timestamptz not null default now()
);
create index citas_fecha_idx on public.citas(fecha, hora);
grant select, insert, update, delete on public.miembros to authenticated;
grant select, insert, update, delete on public.citas to authenticated;
grant all on public.miembros to service_role;
grant all on public.citas to service_role;
alter table public.miembros enable row level security;
alter table public.citas enable row level security;
create policy "Equipo gestiona miembros" on public.miembros for all to authenticated using (true) with check (true);
create policy "Equipo gestiona citas" on public.citas for all to authenticated using (true) with check (true);