-- Profit Sheet: valores diários por loja e taxas configuráveis.
-- Os valores da Shopify/Meta/Google são preenchidos pela sincronização;
-- qualquer valor pode ser corrigido à mão (fica marcado em `manual_overrides`).

create table profit_sheet_days (
  store_id uuid not null references stores(id) on delete cascade,
  date date not null,
  gross numeric(12,2),
  discounts numeric(12,2),
  reversals numeric(12,2),
  orders integer,
  cogs numeric(12,2),
  ads_meta numeric(12,2),
  ads_google numeric(12,2),
  tx_fee numeric(12,2),
  atc_rate numeric(6,2),
  checkout_rate numeric(6,2),
  cvr numeric(6,2),
  note text not null default '',
  manual_overrides text[] not null default '{}',  -- campos editados à mão (a sync não os substitui)
  updated_at timestamptz not null default now(),
  primary key (store_id, date)
);

create table store_fee_settings (
  store_id uuid primary key references stores(id) on delete cascade,
  meta_agency_pct numeric(5,2) not null default 0,
  google_agency_pct numeric(5,2) not null default 0,
  card_cashback_pct numeric(5,2) not null default 0,
  meta_enabled boolean not null default true,
  google_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table profit_sheet_days enable row level security;
alter table store_fee_settings enable row level security;

create policy "gestão por loja" on profit_sheet_days for all using (can_access_store(store_id)) with check (can_access_store(store_id));
create policy "gestão por loja" on store_fee_settings for all using (can_access_store(store_id)) with check (can_access_store(store_id));
