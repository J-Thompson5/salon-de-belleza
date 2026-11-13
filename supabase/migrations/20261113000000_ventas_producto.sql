-- Tabla para la sección "Venta de producto".
-- Ejecutar en el SQL Editor de Supabase.
create table public.ventas_producto (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  fecha date not null default current_date,
  producto text not null,
  marca text not null,
  vendedor text not null,
  valor numeric(12, 2) not null default 0,
  comision_pct numeric(5, 2) not null default 0
);

alter table public.ventas_producto enable row level security;

-- Igual que citas/miembros: cualquier staff autenticado (el registro público está deshabilitado).
create policy "ventas: staff puede leer"
  on public.ventas_producto for select to authenticated using (true);
create policy "ventas: staff puede insertar"
  on public.ventas_producto for insert to authenticated with check (true);
create policy "ventas: staff puede actualizar"
  on public.ventas_producto for update to authenticated using (true) with check (true);
create policy "ventas: staff puede borrar"
  on public.ventas_producto for delete to authenticated using (true);

alter publication supabase_realtime add table public.ventas_producto;
