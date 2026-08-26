-- ============================================================
-- Greece Tracker — Supabase Schema
-- ============================================================

-- Routes surveillées (ex: CDG → ATH)
create table if not exists routes (
  id          uuid primary key default gen_random_uuid(),
  origin      text not null,       -- code IATA, ex: "CDG"
  destination text not null,       -- code IATA, ex: "ATH"
  label       text not null,       -- ex: "Paris → Athènes"
  active      boolean default true,
  created_at  timestamptz default now(),
  unique(origin, destination)
);

-- Snapshots de prix (historique)
create table if not exists price_snapshots (
  id           uuid primary key default gen_random_uuid(),
  route_id     uuid references routes(id) on delete cascade,
  departure_date date not null,
  return_date    date,             -- null si one-way
  price_eur    numeric(8,2) not null,
  airline      text,
  flight_number text,
  duration_min integer,           -- durée en minutes
  stops        integer default 0,
  deep_link    text,              -- lien direct vers la réservation
  source       text default 'amadeus',
  captured_at  timestamptz default now()
);

create index if not exists idx_snapshots_route_date on price_snapshots(route_id, departure_date);
create index if not exists idx_snapshots_captured on price_snapshots(captured_at desc);

-- Alertes prix par route
create table if not exists alerts (
  id              uuid primary key default gen_random_uuid(),
  route_id        uuid references routes(id) on delete cascade,
  direction       text not null check (direction in ('outbound','return','both')),
  max_price_eur   numeric(8,2) not null,
  min_trip_days   integer default 5,
  max_trip_days   integer default 21,
  earliest_depart date,
  latest_depart   date,
  email           text not null,
  active          boolean default true,
  last_triggered  timestamptz,
  created_at      timestamptz default now()
);

-- Vols « best picks » : les meilleures combinaisons aller + retour du moment
create view best_combos as
  select
    o.route_id              as outbound_route_id,
    r.route_id              as return_route_id,
    ro.label                as outbound_label,
    rr.label                as return_label,
    o.departure_date        as outbound_date,
    r.departure_date        as return_date,
    o.price_eur             as outbound_price,
    r.price_eur             as return_price,
    o.price_eur + r.price_eur as total_price,
    r.departure_date - o.departure_date as trip_days,
    o.airline               as outbound_airline,
    r.airline               as return_airline,
    o.deep_link             as outbound_link,
    r.deep_link             as return_link
  from price_snapshots o
  join routes ro on ro.id = o.route_id
  join routes rr on rr.destination = ro.origin and rr.origin = ro.destination
  join price_snapshots r on r.route_id = rr.id
  where o.captured_at > now() - interval '2 hours'
    and r.captured_at > now() - interval '2 hours'
    and r.departure_date > o.departure_date
    and r.departure_date - o.departure_date between 4 and 30;

-- Insérer les routes par défaut
insert into routes (origin, destination, label) values
  ('CDG', 'ATH', 'Paris CDG → Athènes'),
  ('ORY', 'ATH', 'Paris Orly → Athènes'),
  ('CDG', 'HER', 'Paris CDG → Héraklion (Crète)'),
  ('ORY', 'HER', 'Paris Orly → Héraklion (Crète)'),
  ('CDG', 'JMK', 'Paris CDG → Mykonos'),
  ('ORY', 'JMK', 'Paris Orly → Mykonos'),
  ('CDG', 'CFU', 'Paris CDG → Corfou'),
  ('CDG', 'RHO', 'Paris CDG → Rhodes'),
  ('ATH', 'CDG', 'Athènes → Paris CDG'),
  ('ATH', 'ORY', 'Athènes → Paris Orly'),
  ('HER', 'CDG', 'Héraklion → Paris CDG'),
  ('HER', 'ORY', 'Héraklion → Paris Orly'),
  ('JMK', 'CDG', 'Mykonos → Paris CDG'),
  ('JMK', 'ORY', 'Mykonos → Paris Orly'),
  ('CFU', 'CDG', 'Corfou → Paris CDG'),
  ('RHO', 'CDG', 'Rhodes → Paris CDG')
on conflict do nothing;
