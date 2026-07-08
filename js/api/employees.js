import { getClient, getConfig } from '../supabaseClient.js';
import { logAction } from '../auth.js';

export async function listEmployees() {
  const sb = getClient();
  const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getEmployeeStats(employeeId) {
  const sb = getClient();
  const { data: projects, error } = await sb.from('projects').select('id, status, total_amount').eq('assignee_id', employeeId);
  if (error) throw error;
  const active = projects.filter(p => !['hoan_thanh', 'huy'].includes(p.status)).length;
  const done = projects.filter(p => p.status === 'hoan_thanh').length;
  const revenue = projects.reduce((s, p) => s + Number(p.total_amount || 0), 0);
  const { data: commissions } = await sb.from('commissions').select('id, commission_percent, projects(total_amount)').eq('employee_id', employeeId);
  const totalCommission = (commissions || []).reduce((s, c) => s + (Number(c.projects?.total_amount || 0) * Number(c.commission_percent || 0) / 100), 0);
  return { active, done, revenue, totalCommission };
}

export async function createEmployeeAccount({ email, password, full_name, phone, position, role, hire_date }) {
  const { url, anonKey } = getConfig();
  const tempClient = window.supabase.createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await tempClient.auth.signUp({ email, password });
  if (error) throw error;
  // Supabase tra ve "thanh cong" gia (identities rong) khi email da ton tai san,
  // de tranh lo email - luc nay khong co tai khoan moi nao duoc tao voi mat khau vua nhap.
  if (!data.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) {
    throw new Error('Email này đã có tài khoản trong Supabase Auth (có thể chưa xác nhận email). Vào Supabase > Authentication > Users để kiểm tra/xóa tài khoản cũ rồi thử lại.');
  }
  const sb = getClient();
  const { data: profile, error: profErr } = await sb.from('profiles').insert({
    id: data.user.id, email, full_name, phone, position, role, hire_date
  }).select().single();
  if (profErr) throw profErr;
  await logAction('Tạo nhân viên', 'employee', profile.id, profile.full_name);
  return profile;
}

export async function updateEmployee(id, payload) {
  const sb = getClient();
  const { data, error } = await sb.from('profiles').update(payload).eq('id', id).select().single();
  if (error) throw error;
  await logAction('Sửa nhân viên', 'employee', id, data.full_name);
  return data;
}

export async function setEmployeeActive(id, active) {
  const sb = getClient();
  const { error } = await sb.from('profiles').update({ active }).eq('id', id);
  if (error) throw error;
  await logAction(active ? 'Kích hoạt nhân viên' : 'Vô hiệu hóa nhân viên', 'employee', id, '');
}
