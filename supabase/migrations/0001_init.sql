-- FirstView: esquema inicial
-- Aplicar com `supabase db push` ou colando no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

-- Organização (o negócio). Um utilizador pode pertencer a várias.
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- Lojas (normalmente uma por domínio Shopify)
create table stores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  shop_domain text unique,               -- ex.: minhaloja.myshopify.com
  currency text not null default 'EUR',
  timezone text not null default 'Europe/Lisbon',
  created_at timestamptz not null default now()
);

-- Ligações OAuth a plataformas externas (tokens só acessíveis pelo servidor)
create table integrations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  provider text not null check (provider in ('shopify', 'meta_ads', 'google_ads', 'gmail')),
  external_account_id text not null,
  access_token text not null,            -- TODO: encriptar (Supabase Vault)
  refresh_token text,
  expires_at timestamptz,
  status text not null default 'connected' check (status in ('connected', 'error', 'disconnected')),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (store_id, provider, external_account_id)
);

-- Encomendas (Shopify)
create table orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  external_id text not null,
  order_number text,
  created_at timestamptz not null,
  gross_revenue numeric(12,2) not null default 0,
  discounts numeric(12,2) not null default 0,
  shipping numeric(12,2) not null default 0,
  taxes numeric(12,2) not null default 0,
  net_revenue numeric(12,2) not null default 0,
  cogs numeric(12,2) not null default 0,
  currency text not null default 'EUR',
  financial_status text,
  unique (store_id, external_id)
);
create index orders_store_date_idx on orders (store_id, created_at);

-- Produtos e custos (para lucro por produto)
create table products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  external_id text not null,
  title text not null,
  sku text,
  price numeric(12,2),
  unit_cost numeric(12,2),
  unique (store_id, external_id)
);

-- Reembolsos e disputas
create table refunds (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  external_id text not null,
  order_external_id text,
  amount numeric(12,2) not null,
  reason text,
  created_at timestamptz not null,
  unique (store_id, external_id)
);

create table disputes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  external_id text not null,
  order_external_id text,
  amount numeric(12,2) not null,
  reason text,
  status text,
  evidence_due_by timestamptz,
  created_at timestamptz not null,
  unique (store_id, external_id)
);

-- Gasto em anúncios por dia e campanha (Meta Ads, Google Ads)
create table ad_spend_daily (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  provider text not null check (provider in ('meta_ads', 'google_ads')),
  date date not null,
  campaign_id text not null,
  campaign_name text,
  spend numeric(12,2) not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions numeric(12,2) not null default 0,
  conversion_value numeric(12,2) not null default 0,
  unique (store_id, provider, date, campaign_id)
);

-- Despesas manuais
create table expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id) on delete set null,  -- null = todas as lojas
  category text not null check (category in ('operations', 'team', 'personal', 'extra')),
  description text not null,
  amount numeric(12,2) not null,
  date date not null,
  recurring boolean not null default false,
  created_at timestamptz not null default now()
);

-- Apoio ao cliente (Gmail)
create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  gmail_thread_id text not null,
  customer_email text,
  subject text,
  snippet text,
  status text not null default 'open' check (status in ('open', 'pending', 'closed')),
  last_message_at timestamptz,
  unique (store_id, gmail_thread_id)
);

-- Tarefas da equipa
create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  assignee_id uuid references auth.users(id),
  due_date date,
  created_at timestamptz not null default now()
);

-- Vista de lucro diário por loja (base do Dashboard e da Profit Sheet)
create view daily_profit with (security_invoker = true) as
with rev as (
  select store_id, created_at::date as date, sum(net_revenue) as net_revenue, sum(cogs) as cogs
  from orders group by 1, 2
), ads as (
  select store_id, date, sum(spend) as ad_spend from ad_spend_daily group by 1, 2
), ref as (
  select store_id, created_at::date as date, sum(amount) as refunds from refunds group by 1, 2
)
select
  coalesce(rev.store_id, ads.store_id) as store_id,
  coalesce(rev.date, ads.date) as date,
  coalesce(rev.net_revenue, 0) - coalesce(ref.refunds, 0) as net_revenue,
  coalesce(rev.cogs, 0) as cogs,
  coalesce(ads.ad_spend, 0) as ad_spend,
  coalesce(rev.net_revenue, 0) - coalesce(ref.refunds, 0) - coalesce(rev.cogs, 0) - coalesce(ads.ad_spend, 0) as profit
from rev
full join ads on ads.store_id = rev.store_id and ads.date = rev.date
left join ref on ref.store_id = coalesce(rev.store_id, ads.store_id) and ref.date = coalesce(rev.date, ads.date);

-- ---------------------------------------------------------------
-- Row Level Security: cada utilizador só vê dados das suas organizações
-- ---------------------------------------------------------------
create function is_org_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from organization_members where organization_id = org and user_id = auth.uid());
$$;

create function can_access_store(store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from stores s where s.id = store and is_org_member(s.organization_id));
$$;

alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table stores enable row level security;
alter table integrations enable row level security;
alter table orders enable row level security;
alter table products enable row level security;
alter table refunds enable row level security;
alter table disputes enable row level security;
alter table ad_spend_daily enable row level security;
alter table expenses enable row level security;
alter table support_tickets enable row level security;
alter table tasks enable row level security;

create policy "membros veem a organização" on organizations for select using (is_org_member(id));
create policy "membros veem membros" on organization_members for select using (is_org_member(organization_id));
create policy "membros gerem lojas" on stores for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy "membros gerem despesas" on expenses for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));
create policy "membros gerem tarefas" on tasks for all using (is_org_member(organization_id)) with check (is_org_member(organization_id));

create policy "leitura por loja" on orders for select using (can_access_store(store_id));
create policy "leitura por loja" on products for select using (can_access_store(store_id));
create policy "leitura por loja" on refunds for select using (can_access_store(store_id));
create policy "leitura por loja" on disputes for select using (can_access_store(store_id));
create policy "leitura por loja" on ad_spend_daily for select using (can_access_store(store_id));
create policy "gestão por loja" on support_tickets for all using (can_access_store(store_id)) with check (can_access_store(store_id));

-- integrations: sem políticas para utilizadores, por isso os tokens só são lidos com a service role (servidor).
-- Para mostrar o estado das ligações na UI, usa-se esta vista sem os tokens e filtrada por loja.
create view integration_status as
  select id, store_id, provider, external_account_id, status, last_synced_at
  from integrations
  where can_access_store(store_id);
grant select on integration_status to authenticated;
