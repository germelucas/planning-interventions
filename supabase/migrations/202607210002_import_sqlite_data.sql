insert into public.clients (id, first_name, last_name) values
  (1, 'lucas', 'germe'),
  (3, 'Camille', 'Martin'),
  (4, 'Hugo', 'Bernard'),
  (5, 'Sarah', 'Petit')
on conflict (id) do update set first_name = excluded.first_name, last_name = excluded.last_name;

insert into public.employees (id, first_name, last_name) values
  (1, 'lucas', 'germee'),
  (2, 'Léa', 'Dupont'),
  (3, 'Inès', 'Moreau'),
  (4, 'Chloé', 'Garcia')
on conflict (id) do update set first_name = excluded.first_name, last_name = excluded.last_name;

insert into public.interventions (id, client_id, employee_id, start_at, end_at) values
  (2, 4, 2, '2026-07-15 08:00', '2026-07-15 09:00'),
  (3, 4, 2, '2026-07-22 09:00', '2026-07-22 11:00'),
  (4, 4, 2, '2026-07-27 10:15', '2026-07-27 11:15')
on conflict (id) do update set client_id = excluded.client_id, employee_id = excluded.employee_id,
  start_at = excluded.start_at, end_at = excluded.end_at;

select setval(pg_get_serial_sequence('public.clients', 'id'), coalesce(max(id), 1), true) from public.clients;
select setval(pg_get_serial_sequence('public.employees', 'id'), coalesce(max(id), 1), true) from public.employees;
select setval(pg_get_serial_sequence('public.interventions', 'id'), coalesce(max(id), 1), true) from public.interventions;
