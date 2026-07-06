-- ============================================================
-- DU LIEU MAU DE TEST - chi chay 1 lan, sau khi da chay schema.sql
-- va migration_002_add_fields.sql, va da tao tai khoan admin.
-- Chay lai se tao trung du lieu.
-- ============================================================

do $$
declare
  v_admin_id uuid;
  v_cust1 uuid;
  v_cust2 uuid;
  v_mod_kho uuid;
  v_mod_ban_hang uuid;
  v_mod_baocao uuid;
  v_tech_react uuid;
  v_tech_node uuid;
  v_tech_pg uuid;
  v_proj1 uuid;
begin
  select id into v_admin_id from profiles where role = 'admin' limit 1;

  insert into customers (company_name, contact_person, phone, email, industry, note, created_by)
  values ('Công ty TNHH Sản Xuất Thịnh Phát', 'Nguyễn Văn A', '0901234567', 'a.nguyen@thinhphat.com', 'Sản xuất', 'Khách hàng quan tâm phần mềm quản lý kho + bán hàng', v_admin_id)
  returning id into v_cust1;

  insert into customers (company_name, contact_person, phone, email, industry, note, created_by)
  values ('Cửa hàng Bán lẻ Minh Anh', 'Trần Thị B', '0912345678', 'b.tran@minhanh.vn', 'Bán lẻ', 'Đang chờ báo giá', v_admin_id)
  returning id into v_cust2;

  insert into modules_catalog (name, group_name, price, note) values ('Quản lý Kho', 'Kho', 15000000, 'Module quản lý xuất nhập tồn kho') returning id into v_mod_kho;
  insert into module_features (module_id, name) values
    (v_mod_kho, 'Xuất kho'), (v_mod_kho, 'Nhập kho'), (v_mod_kho, 'Kiểm kho'), (v_mod_kho, 'Barcode'), (v_mod_kho, 'QR Code');

  insert into modules_catalog (name, group_name, price, note) values ('Bán hàng', 'Bán hàng', 20000000, 'Module quản lý bán hàng, hóa đơn') returning id into v_mod_ban_hang;
  insert into module_features (module_id, name) values
    (v_mod_ban_hang, 'Tạo hóa đơn'), (v_mod_ban_hang, 'Quản lý đơn hàng'), (v_mod_ban_hang, 'Khuyến mãi');

  insert into modules_catalog (name, group_name, price, note) values ('Báo cáo thống kê', 'Báo cáo', 10000000, 'Module xuất báo cáo doanh thu, tồn kho') returning id into v_mod_baocao;
  insert into module_features (module_id, name) values
    (v_mod_baocao, 'Báo cáo doanh thu'), (v_mod_baocao, 'Báo cáo tồn kho');

  insert into technologies (name, category, price) values ('React', 'Frontend', 0) returning id into v_tech_react;
  insert into technologies (name, category, price) values ('NodeJS', 'Backend', 0) returning id into v_tech_node;
  insert into technologies (name, category, price) values ('PostgreSQL', 'Database', 0) returning id into v_tech_pg;
  insert into technologies (name, category, price) values ('Vue', 'Frontend', 0);
  insert into technologies (name, category, price) values ('Docker', 'Khac', 0);

  -- Du an 1: da co san module/cong nghe/dot thanh toan de xem giao dien ngay
  insert into projects (
    name, customer_id, assignee_id, software_type, industry, description, status,
    total_amount, deposit_amount, start_date, deadline_date, warranty_months, created_by
  ) values (
    'Phần Mềm Công Ty Sản Xuất', v_cust1, v_admin_id, 'Quản lý sản xuất', 'Sản xuất',
    E'Khách hàng cần phần mềm quản lý:\n- Quản lý kho nguyên vật liệu và thành phẩm\n- Quản lý đơn hàng bán ra\n- Báo cáo doanh thu theo tháng',
    'dang_lap_trinh', 35000000, 10500000, current_date - 20, current_date + 15, 12, v_admin_id
  ) returning id into v_proj1;

  insert into project_modules (project_id, module_id, name_snapshot, price, note) values
    (v_proj1, v_mod_kho, 'Quản lý Kho', 15000000, ''),
    (v_proj1, v_mod_ban_hang, 'Bán hàng', 20000000, '');

  insert into project_technologies (project_id, technology_id) values
    (v_proj1, v_tech_react), (v_proj1, v_tech_node), (v_proj1, v_tech_pg);

  insert into payment_installments (project_id, name, percent, amount, status, sort_order, paid_at, confirmed_by) values
    (v_proj1, 'Cọc', 30, 10500000, 'da_thanh_toan', 0, now() - interval '15 days', v_admin_id),
    (v_proj1, 'Thanh toán lần 2', 40, 14000000, 'chua_thanh_toan', 1, null, null),
    (v_proj1, 'Thanh toán cuối', 30, 10500000, 'chua_thanh_toan', 2, null, null);

  if v_admin_id is not null then
    insert into commissions (project_id, employee_id, commission_percent) values (v_proj1, v_admin_id, 10);
  end if;

  -- Du an 2: chua co module/bao gia gi ca, de test luong "chon du an -> them module/cong nghe -> tao bao gia -> xac nhan lam"
  insert into projects (name, customer_id, assignee_id, software_type, industry, description, status, total_amount, deposit_amount, created_by)
  values ('Phần Mềm Bán Lẻ Minh Anh', v_cust2, v_admin_id, 'Bán hàng', 'Bán lẻ', 'Yêu cầu quản lý bán hàng đơn giản cho 1 cửa hàng', 'cho_bao_gia', 0, 0, v_admin_id);
end $$;
