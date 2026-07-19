import { getClient } from '../supabaseClient.js';
import { logAction } from '../auth.js';

export async function listCustomers() {
  const sb = getClient();
  const { data, error } = await sb.from('customers').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getCustomer(id) {
  const sb = getClient();
  const { data, error } = await sb.from('customers').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getCustomerProjects(id) {
  const sb = getClient();
  const { data, error } = await sb.from('projects').select('*').eq('customer_id', id).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getCustomerQuotes(id) {
  const sb = getClient();
  const { data, error } = await sb.from('quotes').select('*').eq('customer_id', id).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getCustomerAttachments(id) {
  const sb = getClient();
  const { data, error } = await sb.from('attachments').select('*').eq('entity_type', 'customer').eq('entity_id', id).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createCustomer(payload) {
  const sb = getClient();
  const { data, error } = await sb.from('customers').insert(payload).select().single();
  if (error) throw error;
  await logAction('Tạo khách hàng', 'customer', data.id, data.company_name);
  return data;
}

export async function updateCustomer(id, payload) {
  const sb = getClient();
  const { data, error } = await sb.from('customers').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw error;
  await logAction('Sửa khách hàng', 'customer', id, data.company_name);
  return data;
}

export async function deleteCustomer(id) {
  const sb = getClient();
  const { error } = await sb.from('customers').delete().eq('id', id);
  if (error) throw error;
  await logAction('Xóa khách hàng', 'customer', id, '');
}

export async function uploadAttachment(entityType, entityId, file, uploadedBy) {
  const sb = getClient();
  const path = `${entityType}/${entityId}/${Date.now()}_${file.name}`;
  const { error: upErr } = await sb.storage.from('attachments').upload(path, file);
  if (upErr) throw upErr;
  const { data: pub } = sb.storage.from('attachments').getPublicUrl(path);
  const { data, error } = await sb.from('attachments').insert({
    entity_type: entityType, entity_id: entityId, file_url: pub.publicUrl, file_name: file.name, uploaded_by: uploadedBy
  }).select().single();
  if (error) throw error;
  return data;
}
