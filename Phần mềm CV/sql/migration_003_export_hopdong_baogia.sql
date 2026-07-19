-- ============================================================
-- MIGRATION 003 - chay 1 lan trong SQL Editor tren project da co san
-- (cho tinh nang: Xuat Bao gia + Xuat Hop dong ngay tu trang Du an)
-- ============================================================

-- Thong tin phap ly bo sung cho khach hang - dung lam "BEN A" trong hop dong
alter table customers add column if not exists address text;
alter table customers add column if not exists tax_code text;
alter table customers add column if not exists representative_name text;
alter table customers add column if not exists representative_position text;

-- Thong tin phap ly bo sung cho cong ty - dung lam "BEN B" trong hop dong
alter table company_settings add column if not exists tax_code text;
alter table company_settings add column if not exists representative_name text;
alter table company_settings add column if not exists representative_position text;

-- So hop dong / so bao gia va ngay ky, luu tren du an de giu nguyen
-- moi lan mo lai xuat file (khong doi so/ngay theo lan bam in)
alter table projects add column if not exists contract_number text;
alter table projects add column if not exists contract_signed_date date;
alter table projects add column if not exists quote_number text;
alter table projects add column if not exists quote_date date;
alter table projects add column if not exists acceptance_days int not null default 3;

-- Mo ta thoi diem thanh toan cho tung dot, hien thi trong Dieu 2 cua hop dong
-- (VD: "Dat coc ngay khi ky hop dong", "Khi nghiem thu, ban giao...")
alter table payment_installments add column if not exists due_note text;

-- Do kho cua module, dung de hien thi nhan (badge: De / Trung binh / Kho / Rat kho)
-- tren phieu bao gia dep giong file mau
alter table modules_catalog add column if not exists difficulty text not null default 'trung_binh';
alter table modules_catalog drop constraint if exists modules_catalog_difficulty_check;
alter table modules_catalog add constraint modules_catalog_difficulty_check
  check (difficulty in ('de','trung_binh','kho','rat_kho'));

-- ============================================================
-- HET FILE MIGRATION 003
-- ============================================================
