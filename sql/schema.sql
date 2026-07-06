-- ============================================================
-- PHAN MEM QUAN LY DU AN PHAT TRIEN PHAN MEM - SUPABASE SCHEMA
-- Chay toan bo file nay 1 lan trong Supabase SQL Editor
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1. ENUM TYPES
-- ============================================================

create type user_role as enum ('admin','manager','sale','developer','accountant');

create type project_status as enum (
  'cho_bao_gia','da_gui_bao_gia','cho_coc','da_coc',
  'dang_phan_tich','dang_thiet_ke','dang_lap_trinh','dang_kiem_thu',
  'cho_ban_giao','da_ban_giao','dang_bao_hanh','hoan_thanh','tam_dung','huy'
);

create type installment_status as enum ('chua_thanh_toan','da_thanh_toan');
create type commission_payment_status as enum ('cho_duyet','da_thanh_toan');
create type quote_status as enum ('nhap','da_gui');

-- ============================================================
-- 2. PROFILES (nhan vien / nguoi dung he thong)
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_code text unique,
  full_name text not null,
  phone text,
  email text,
  position text,
  role user_role not null default 'sale',
  hire_date date,
  active boolean not null default true,
  bank_name text,
  bank_bin text,
  bank_account_number text,
  bank_account_holder text,
  default_commission_percent numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);

create sequence employee_code_seq;
create or replace function set_employee_code() returns trigger as $$
begin
  if new.employee_code is null then
    new.employee_code := 'NV-' || lpad(nextval('employee_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_employee_code before insert on profiles
  for each row execute function set_employee_code();

-- Khong dung trigger tren auth.users de tu tao profile: trigger chay trong
-- transaction cua GoTrue va rat de gay loi "Database error creating new user"
-- kho debug. Thay vao do, ung dung (js/api/employees.js) tu insert vao
-- profiles ngay sau khi tao tai khoan Auth thanh cong.

-- ============================================================
-- 3. ROLE PERMISSIONS (phan quyen chi tiet, chinh sua duoc tren UI)
-- ============================================================

create table role_permissions (
  role user_role not null,
  module text not null,
  can_view boolean not null default false,
  can_add boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  can_export_pdf boolean not null default false,
  can_export_excel boolean not null default false,
  can_approve_payment boolean not null default false,
  can_approve_commission boolean not null default false,
  primary key (role, module)
);

create or replace function has_permission(p_module text, p_action text) returns boolean as $$
declare
  v_role user_role;
  v_allowed boolean;
begin
  select role into v_role from profiles where id = auth.uid();
  if v_role is null then return false; end if;
  if v_role = 'admin' then return true; end if;
  execute format('select %I from role_permissions where role = $1 and module = $2', p_action)
    into v_allowed using v_role, p_module;
  return coalesce(v_allowed, false);
end;
$$ language plpgsql security definer stable;

-- ============================================================
-- 4. DANH MUC CONG NGHE
-- ============================================================

create table technologies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Khac',
  price numeric(14,0) not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5. DANH MUC MODULE
-- ============================================================

create table modules_catalog (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  group_name text,
  price numeric(14,0) not null default 0,
  note text,
  created_at timestamptz not null default now()
);

create table module_features (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules_catalog(id) on delete cascade,
  name text not null
);

-- ============================================================
-- 6. KHACH HANG
-- ============================================================

create table customers (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  company_name text not null,
  contact_person text,
  phone text,
  email text,
  industry text,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence customer_code_seq;
create or replace function set_customer_code() returns trigger as $$
begin
  if new.code is null then
    new.code := 'CUS-' || lpad(nextval('customer_code_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_customer_code before insert on customers
  for each row execute function set_customer_code();

-- ============================================================
-- 7. DU AN
-- ============================================================

create table projects (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  customer_id uuid not null references customers(id),
  assignee_id uuid references profiles(id),
  software_type text,
  industry text,
  description text,
  status project_status not null default 'cho_bao_gia',
  total_amount numeric(14,0) not null default 0,
  deposit_amount numeric(14,0) not null default 0,
  created_at timestamptz not null default now(),
  start_date date,
  deadline_date date,
  delivery_date date,
  warranty_months int not null default 0,
  warranty_end_date date,
  created_by uuid references profiles(id),
  updated_at timestamptz not null default now()
);

create sequence project_code_seq;
create or replace function set_project_code() returns trigger as $$
begin
  if new.code is null then
    new.code := 'PRJ-' || lpad(nextval('project_code_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_project_code before insert on projects
  for each row execute function set_project_code();

create table project_modules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  module_id uuid references modules_catalog(id),
  name_snapshot text not null,
  price numeric(14,0) not null default 0,
  note text
);

create table project_technologies (
  project_id uuid not null references projects(id) on delete cascade,
  technology_id uuid not null references technologies(id) on delete cascade,
  primary key (project_id, technology_id)
);

create table payment_installments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  percent numeric(5,2),
  amount numeric(14,0) not null default 0,
  status installment_status not null default 'chua_thanh_toan',
  sort_order int not null default 0,
  paid_at timestamptz,
  confirmed_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);

-- view tinh toan da thanh toan / cong no theo tung du an
create view project_financials as
select
  p.id as project_id,
  p.total_amount,
  p.deposit_amount,
  coalesce(sum(pi.amount) filter (where pi.status = 'da_thanh_toan'), 0) as paid_amount,
  p.total_amount - coalesce(sum(pi.amount) filter (where pi.status = 'da_thanh_toan'), 0) as debt_amount
from projects p
left join payment_installments pi on pi.project_id = p.id
group by p.id;

-- ============================================================
-- 8. BAO GIA
-- ============================================================

create table quotes (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  customer_id uuid not null references customers(id),
  project_id uuid references projects(id),
  version_no int not null default 1,
  status quote_status not null default 'nhap',
  subtotal numeric(14,0) not null default 0,
  discount_percent numeric(5,2) not null default 0,
  discount_amount numeric(14,0) not null default 0,
  total numeric(14,0) not null default 0,
  note text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

create sequence quote_code_seq;
create or replace function set_quote_code() returns trigger as $$
begin
  if new.code is null then
    new.code := 'QUO-' || lpad(nextval('quote_code_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;
create trigger trg_quote_code before insert on quotes
  for each row execute function set_quote_code();

create table quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  module_id uuid references modules_catalog(id),
  technology_id uuid references technologies(id),
  name_snapshot text not null,
  price numeric(14,0) not null default 0,
  discount numeric(14,0) not null default 0,
  note text
);

-- ============================================================
-- 9. HOA HONG
-- ============================================================

create table commissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  employee_id uuid not null references profiles(id),
  commission_percent numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, employee_id)
);

create table commission_payments (
  id uuid primary key default gen_random_uuid(),
  commission_id uuid not null references commissions(id) on delete cascade,
  amount numeric(14,0) not null default 0,
  status commission_payment_status not null default 'cho_duyet',
  payment_date timestamptz,
  approved_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 10. THONG BAO
-- ============================================================

create table notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  message text,
  related_project_id uuid references projects(id),
  target_role user_role,
  target_user_id uuid references profiles(id),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 11. NHAT KY THAO TAC
-- ============================================================

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  description text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 12. FILE DINH KEM
-- ============================================================

create table attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  file_url text not null,
  file_name text not null,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 13. CAI DAT CONG TY (singleton)
-- ============================================================

create table company_settings (
  id int primary key default 1,
  company_name text,
  logo_url text,
  address text,
  phone text,
  email text,
  website text,
  bank_name text,
  bank_bin text,
  bank_account_number text,
  bank_account_holder text,
  quote_note text,
  contract_terms text,
  default_warranty_months int not null default 12,
  theme_color text not null default '#2563eb',
  currency text not null default 'VND',
  updated_at timestamptz not null default now(),
  constraint singleton check (id = 1)
);
insert into company_settings (id, company_name) values (1, 'Cong ty cua ban');

-- ============================================================
-- 14. STORAGE BUCKET cho file dinh kem
-- ============================================================

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

-- ============================================================
-- 15. ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table role_permissions enable row level security;
alter table technologies enable row level security;
alter table modules_catalog enable row level security;
alter table module_features enable row level security;
alter table customers enable row level security;
alter table projects enable row level security;
alter table project_modules enable row level security;
alter table project_technologies enable row level security;
alter table payment_installments enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table commissions enable row level security;
alter table commission_payments enable row level security;
alter table notifications enable row level security;
alter table audit_log enable row level security;
alter table attachments enable row level security;
alter table company_settings enable row level security;

-- profiles: ai cung xem duoc (de hien ten nguoi phu trach...), tu sua thong tin minh, admin sua tat ca
create policy profiles_select on profiles for select using (auth.uid() is not null);
create policy profiles_update_self on profiles for update using (auth.uid() = id);
create policy profiles_update_admin on profiles for update using (has_permission('employees','can_edit'));
create policy profiles_insert_admin on profiles for insert with check (has_permission('employees','can_add'));
create policy profiles_delete_admin on profiles for delete using (has_permission('employees','can_delete'));

create policy role_permissions_select on role_permissions for select using (auth.uid() is not null);
create policy role_permissions_all_admin on role_permissions for all using (has_permission('permissions','can_edit')) with check (has_permission('permissions','can_edit'));

-- danh muc: xem chung, sua theo quyen module tuong ung
create policy technologies_select on technologies for select using (auth.uid() is not null);
create policy technologies_insert on technologies for insert with check (has_permission('technologies','can_add'));
create policy technologies_update on technologies for update using (has_permission('technologies','can_edit'));
create policy technologies_delete on technologies for delete using (has_permission('technologies','can_delete'));

create policy modules_catalog_select on modules_catalog for select using (auth.uid() is not null);
create policy modules_catalog_insert on modules_catalog for insert with check (has_permission('modules_catalog','can_add'));
create policy modules_catalog_update on modules_catalog for update using (has_permission('modules_catalog','can_edit'));
create policy modules_catalog_delete on modules_catalog for delete using (has_permission('modules_catalog','can_delete'));

create policy module_features_select on module_features for select using (auth.uid() is not null);
create policy module_features_insert on module_features for insert with check (has_permission('modules_catalog','can_add'));
create policy module_features_update on module_features for update using (has_permission('modules_catalog','can_edit'));
create policy module_features_delete on module_features for delete using (has_permission('modules_catalog','can_delete'));

-- khach hang
create policy customers_select on customers for select using (auth.uid() is not null);
create policy customers_insert on customers for insert with check (has_permission('customers','can_add'));
create policy customers_update on customers for update using (has_permission('customers','can_edit'));
create policy customers_delete on customers for delete using (has_permission('customers','can_delete'));

-- du an: developer chi xem du an duoc giao
create policy projects_select on projects for select using (
  has_permission('projects','can_view') and (
    (select role from profiles where id = auth.uid()) <> 'developer'
    or assignee_id = auth.uid()
  )
);
create policy projects_insert on projects for insert with check (has_permission('projects','can_add'));
create policy projects_update on projects for update using (has_permission('projects','can_edit'));
create policy projects_delete on projects for delete using (has_permission('projects','can_delete'));

create policy project_modules_select on project_modules for select using (auth.uid() is not null);
create policy project_modules_insert on project_modules for insert with check (has_permission('projects','can_edit'));
create policy project_modules_update on project_modules for update using (has_permission('projects','can_edit'));
create policy project_modules_delete on project_modules for delete using (has_permission('projects','can_edit'));

create policy project_technologies_select on project_technologies for select using (auth.uid() is not null);
create policy project_technologies_insert on project_technologies for insert with check (has_permission('projects','can_edit'));
create policy project_technologies_delete on project_technologies for delete using (has_permission('projects','can_edit'));

create policy payment_installments_select on payment_installments for select using (auth.uid() is not null);
create policy payment_installments_insert on payment_installments for insert with check (has_permission('projects','can_edit'));
create policy payment_installments_update on payment_installments for update using (
  has_permission('projects','can_edit') or has_permission('projects','can_approve_payment')
);
create policy payment_installments_delete on payment_installments for delete using (has_permission('projects','can_edit'));

-- bao gia
create policy quotes_select on quotes for select using (auth.uid() is not null);
create policy quotes_insert on quotes for insert with check (has_permission('quotes','can_add'));
create policy quotes_update on quotes for update using (has_permission('quotes','can_edit'));
create policy quotes_delete on quotes for delete using (has_permission('quotes','can_delete'));

create policy quote_items_select on quote_items for select using (auth.uid() is not null);
create policy quote_items_insert on quote_items for insert with check (has_permission('quotes','can_edit'));
create policy quote_items_update on quote_items for update using (has_permission('quotes','can_edit'));
create policy quote_items_delete on quote_items for delete using (has_permission('quotes','can_edit'));

-- hoa hong
create policy commissions_select on commissions for select using (
  has_permission('commissions','can_view') and (
    (select role from profiles where id = auth.uid()) not in ('developer')
    or employee_id = auth.uid()
  )
);
create policy commissions_insert on commissions for insert with check (has_permission('commissions','can_add'));
create policy commissions_update on commissions for update using (has_permission('commissions','can_edit'));
create policy commissions_delete on commissions for delete using (has_permission('commissions','can_delete'));

create policy commission_payments_select on commission_payments for select using (has_permission('commissions','can_view'));
create policy commission_payments_insert on commission_payments for insert with check (has_permission('commissions','can_edit'));
create policy commission_payments_update on commission_payments for update using (
  has_permission('commissions','can_edit') or has_permission('commissions','can_approve_commission')
);
create policy commission_payments_delete on commission_payments for delete using (has_permission('commissions','can_delete'));

-- thong bao: tat ca deu xem duoc, chi cap nhat is_read cho chinh minh
create policy notifications_select on notifications for select using (auth.uid() is not null);
create policy notifications_insert on notifications for insert with check (auth.uid() is not null);
create policy notifications_update on notifications for update using (auth.uid() is not null);

-- nhat ky thao tac: ai cung xem duoc (minh bach noi bo), chi he thong ghi (insert cho user dang nhap)
create policy audit_log_select on audit_log for select using (auth.uid() is not null);
create policy audit_log_insert on audit_log for insert with check (auth.uid() is not null);

-- file dinh kem
create policy attachments_select on attachments for select using (auth.uid() is not null);
create policy attachments_insert on attachments for insert with check (auth.uid() is not null);
create policy attachments_delete on attachments for delete using (auth.uid() is not null);

-- cai dat
create policy company_settings_select on company_settings for select using (auth.uid() is not null);
create policy company_settings_update on company_settings for update using (has_permission('settings','can_edit'));

-- storage policies cho bucket attachments
create policy storage_attachments_select on storage.objects for select using (bucket_id = 'attachments');
create policy storage_attachments_insert on storage.objects for insert with check (bucket_id = 'attachments' and auth.uid() is not null);
create policy storage_attachments_delete on storage.objects for delete using (bucket_id = 'attachments' and auth.uid() is not null);

-- ============================================================
-- 16. DU LIEU MAC DINH CHO PHAN QUYEN (co the sua lai tren UI)
-- ============================================================

do $$
declare
  m text;
  modules text[] := array['dashboard','customers','projects','quotes','modules_catalog','technologies','employees','commissions','statistics','notifications','audit_log','permissions','settings'];
begin
  foreach m in array modules loop
    insert into role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_export_pdf, can_export_excel, can_approve_payment, can_approve_commission)
    values ('manager', m, true, true, true, m not in ('permissions'), true, true, true, true)
    on conflict do nothing;

    insert into role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_export_pdf, can_export_excel, can_approve_payment, can_approve_commission)
    values ('sale', m, m in ('dashboard','customers','projects','quotes','modules_catalog','technologies','statistics','notifications'), m in ('customers','quotes'), m in ('customers','quotes'), false, m in ('customers','quotes'), m in ('customers','quotes'), false, false)
    on conflict do nothing;

    insert into role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_export_pdf, can_export_excel, can_approve_payment, can_approve_commission)
    values ('developer', m, m in ('dashboard','projects','notifications'), false, false, false, false, false, false, false)
    on conflict do nothing;

    insert into role_permissions (role, module, can_view, can_add, can_edit, can_delete, can_export_pdf, can_export_excel, can_approve_payment, can_approve_commission)
    values ('accountant', m, m in ('dashboard','customers','projects','commissions','statistics','notifications'), false, m in ('commissions'), false, true, true, true, true)
    on conflict do nothing;
  end loop;
end $$;

-- ============================================================
-- HET FILE. Sau khi chay xong, xem huong dan trong SETUP.md
-- de tao tai khoan admin dau tien.
-- ============================================================
