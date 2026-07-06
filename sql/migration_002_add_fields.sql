-- ============================================================
-- MIGRATION 002 - chay 1 lan trong SQL Editor tren project da co san
-- (cho cac tinh nang: gia cong nghe, % hoa hong mac dinh nhan vien,
--  bao gia gan voi du an + ap dung vao du an)
-- ============================================================

alter table technologies add column if not exists price numeric(14,0) not null default 0;

alter table profiles add column if not exists default_commission_percent numeric(5,2) not null default 0;

alter table quotes add column if not exists applied_at timestamptz;
-- project_id khong bat buoc NOT NULL o DB de tranh loi neu da co du lieu cu;
-- ung dung (QuoteDetail.js) bat buoc chon du an khi tao bao gia moi.

alter table quote_items add column if not exists technology_id uuid references technologies(id);
