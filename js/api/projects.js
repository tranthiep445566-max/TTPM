import { getClient } from '../supabaseClient.js';
import { logAction } from '../auth.js';

export async function listProjects() {
  const sb = getClient();
  const { data, error } = await sb.from('projects').select('*, customers(company_name), profiles(full_name)').order('created_at', { ascending: false });
  if (error) throw error;
  const finMap = await fetchFinancialsMap(data.map(p => p.id));
  data.forEach(p => { p.financials = finMap[p.id] || { paid_amount: 0, debt_amount: p.total_amount }; });
  return data;
}

export async function fetchFinancialsMap(projectIds) {
  if (!projectIds.length) return {};
  const sb = getClient();
  const { data, error } = await sb.from('project_financials').select('*').in('project_id', projectIds);
  if (error) throw error;
  const map = {};
  data.forEach(f => { map[f.project_id] = f; });
  return map;
}

export async function getProject(id) {
  const sb = getClient();
  const { data, error } = await sb.from('projects').select('*, customers(*), profiles(*)').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getProjectFinancials(id) {
  const sb = getClient();
  const { data, error } = await sb.from('project_financials').select('*').eq('project_id', id).single();
  if (error) throw error;
  return data;
}

export async function createProject(payload) {
  const sb = getClient();
  const { data, error } = await sb.from('projects').insert(payload).select().single();
  if (error) throw error;
  await logAction('Tạo dự án', 'project', data.id, data.name);
  return data;
}

export async function updateProject(id, payload) {
  const sb = getClient();
  const { data, error } = await sb.from('projects').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  await logAction('Sửa dự án', 'project', id, data.name);
  return data;
}

export async function deleteProject(id) {
  const sb = getClient();
  const { error } = await sb.from('projects').delete().eq('id', id);
  if (error) throw error;
  await logAction('Xóa dự án', 'project', id, '');
}

export async function listProjectModules(projectId) {
  const sb = getClient();
  const { data, error } = await sb.from('project_modules').select('*').eq('project_id', projectId);
  if (error) throw error;
  return data;
}

export async function addProjectModule(payload) {
  const sb = getClient();
  const { data, error } = await sb.from('project_modules').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function removeProjectModule(id) {
  const sb = getClient();
  const { error } = await sb.from('project_modules').delete().eq('id', id);
  if (error) throw error;
}

export async function listProjectTechnologies(projectId) {
  const sb = getClient();
  const { data, error } = await sb.from('project_technologies').select('technology_id, technologies(*)').eq('project_id', projectId);
  if (error) throw error;
  return data;
}

export async function setProjectTechnologies(projectId, technologyIds) {
  const sb = getClient();
  await sb.from('project_technologies').delete().eq('project_id', projectId);
  if (technologyIds.length) {
    const { error } = await sb.from('project_technologies').insert(technologyIds.map(tid => ({ project_id: projectId, technology_id: tid })));
    if (error) throw error;
  }
}

export async function listInstallments(projectId) {
  const sb = getClient();
  const { data, error } = await sb.from('payment_installments').select('*').eq('project_id', projectId).order('sort_order');
  if (error) throw error;
  return data;
}

export async function addInstallment(payload) {
  const sb = getClient();
  const { data, error } = await sb.from('payment_installments').insert(payload).select().single();
  if (error) throw error;
  await logAction('Thêm đợt thanh toán', 'payment_installment', data.id, payload.name);
  return data;
}

export async function deleteInstallment(id) {
  const sb = getClient();
  const { error } = await sb.from('payment_installments').delete().eq('id', id);
  if (error) throw error;
}

export async function confirmInstallmentPaid(id, confirmedBy) {
  const sb = getClient();
  const { data, error } = await sb.from('payment_installments').update({
    status: 'da_thanh_toan', paid_at: new Date().toISOString(), confirmed_by: confirmedBy
  }).eq('id', id).select().single();
  if (error) throw error;
  await logAction('Xác nhận thanh toán', 'payment_installment', id, data.name);
  return data;
}

export async function listAttachments(projectId) {
  const sb = getClient();
  const { data, error } = await sb.from('attachments').select('*').eq('entity_type', 'project').eq('entity_id', projectId).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
