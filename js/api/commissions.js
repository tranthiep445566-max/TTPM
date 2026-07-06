import { getClient } from '../supabaseClient.js';
import { logAction } from '../auth.js';
import { fetchFinancialsMap } from './projects.js';

export async function listCommissions() {
  const sb = getClient();
  const { data, error } = await sb.from('commissions').select('*, profiles(full_name, bank_name, bank_bin, bank_account_number, bank_account_holder), projects(id, name, code, total_amount, status)').order('created_at', { ascending: false });
  if (error) throw error;
  const finMap = await fetchFinancialsMap(data.map(c => c.projects.id));
  data.forEach(c => { c.projects.financials = finMap[c.projects.id] || { paid_amount: 0, debt_amount: c.projects.total_amount }; });
  return data;
}

export async function createCommission(payload) {
  const sb = getClient();
  const { data, error } = await sb.from('commissions').insert(payload).select().single();
  if (error) throw error;
  await logAction('Tạo hoa hồng', 'commission', data.id, '');
  return data;
}

export async function updateCommission(id, payload) {
  const sb = getClient();
  const { data, error } = await sb.from('commissions').update(payload).eq('id', id).select().single();
  if (error) throw error;
  await logAction('Sửa hoa hồng', 'commission', id, '');
  return data;
}

export async function deleteCommission(id) {
  const sb = getClient();
  const { error } = await sb.from('commissions').delete().eq('id', id);
  if (error) throw error;
  await logAction('Xóa hoa hồng', 'commission', id, '');
}

export async function listCommissionPayments(commissionId) {
  const sb = getClient();
  const { data, error } = await sb.from('commission_payments').select('*, profiles!commission_payments_approved_by_fkey(full_name)').eq('commission_id', commissionId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listAllCommissionPayments() {
  const sb = getClient();
  const { data, error } = await sb.from('commission_payments').select('*, commissions(project_id, employee_id, profiles(full_name), projects(name, code))').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createCommissionPayment(payload) {
  const sb = getClient();
  const { data, error } = await sb.from('commission_payments').insert(payload).select().single();
  if (error) throw error;
  await logAction('Tạo đề nghị thanh toán hoa hồng', 'commission_payment', data.id, '');
  return data;
}

export async function approveCommissionPayment(id, approvedBy) {
  const sb = getClient();
  const { data, error } = await sb.from('commission_payments').update({
    status: 'da_thanh_toan', payment_date: new Date().toISOString(), approved_by: approvedBy
  }).eq('id', id).select().single();
  if (error) throw error;
  await logAction('Duyệt thanh toán hoa hồng', 'commission_payment', id, '');
  return data;
}
