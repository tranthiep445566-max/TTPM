import { getClient } from '../supabaseClient.js';
import { logAction } from '../auth.js';
import { updateProject, setProjectTechnologies } from './projects.js';

export async function listQuotes() {
  const sb = getClient();
  const { data, error } = await sb.from('quotes').select('*, customers(company_name), projects(name, code)').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function listQuotesForProject(projectId) {
  const sb = getClient();
  const { data, error } = await sb.from('quotes').select('*').eq('project_id', projectId).order('version_no', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getQuote(id) {
  const sb = getClient();
  const { data, error } = await sb.from('quotes').select('*, customers(*), projects(name, code)').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getQuoteItems(quoteId) {
  const sb = getClient();
  const { data, error } = await sb.from('quote_items').select('*').eq('quote_id', quoteId);
  if (error) throw error;
  return data;
}

export async function nextVersionForProject(projectId) {
  const sb = getClient();
  const { data, error } = await sb.from('quotes').select('version_no').eq('project_id', projectId).order('version_no', { ascending: false }).limit(1);
  if (error) throw error;
  return data.length ? data[0].version_no + 1 : 1;
}

export async function createQuote(payload, items) {
  const sb = getClient();
  const { data, error } = await sb.from('quotes').insert(payload).select().single();
  if (error) throw error;
  if (items.length) {
    const { error: itemErr } = await sb.from('quote_items').insert(items.map(i => ({ ...i, quote_id: data.id })));
    if (itemErr) throw itemErr;
  }
  await logAction('Tạo báo giá', 'quote', data.id, data.code);
  return data;
}

export async function updateQuote(id, payload) {
  const sb = getClient();
  const { data, error } = await sb.from('quotes').update(payload).eq('id', id).select().single();
  if (error) throw error;
  await logAction('Sửa báo giá', 'quote', id, data.code);
  return data;
}

export async function deleteQuote(id) {
  const sb = getClient();
  const { error } = await sb.from('quotes').delete().eq('id', id);
  if (error) throw error;
  await logAction('Xóa báo giá', 'quote', id, '');
}

export async function applyQuoteToProject(quoteId) {
  const sb = getClient();
  const quote = await getQuote(quoteId);
  if (!quote.project_id) throw new Error('Báo giá này chưa gắn với dự án nào');
  const items = await getQuoteItems(quoteId);

  await sb.from('project_modules').delete().eq('project_id', quote.project_id);
  const moduleItems = items.filter(i => i.module_id);
  if (moduleItems.length) {
    const { error: modErr } = await sb.from('project_modules').insert(moduleItems.map(i => ({
      project_id: quote.project_id, module_id: i.module_id, name_snapshot: i.name_snapshot, price: i.price, note: i.note
    })));
    if (modErr) throw modErr;
  }

  const techIds = [...new Set(items.filter(i => i.technology_id).map(i => i.technology_id))];
  if (techIds.length) await setProjectTechnologies(quote.project_id, techIds);

  await updateProject(quote.project_id, { total_amount: quote.total });

  const { data, error } = await sb.from('quotes').update({ applied_at: new Date().toISOString() }).eq('id', quoteId).select().single();
  if (error) throw error;
  await logAction('Áp dụng báo giá vào dự án', 'quote', quoteId, quote.code);
  return data;
}
