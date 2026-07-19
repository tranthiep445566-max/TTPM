import { getClient } from '../supabaseClient.js';
import { logAction } from '../auth.js';

export async function listTechnologies() {
  const sb = getClient();
  const { data, error } = await sb.from('technologies').select('*').order('category');
  if (error) throw error;
  return data;
}

export async function createTechnology(payload) {
  const sb = getClient();
  const { data, error } = await sb.from('technologies').insert(payload).select().single();
  if (error) throw error;
  await logAction('Tạo công nghệ', 'technology', data.id, data.name);
  return data;
}

export async function updateTechnology(id, payload) {
  const sb = getClient();
  const { data, error } = await sb.from('technologies').update(payload).eq('id', id).select().single();
  if (error) throw error;
  await logAction('Sửa công nghệ', 'technology', id, data.name);
  return data;
}

export async function deleteTechnology(id) {
  const sb = getClient();
  const { error } = await sb.from('technologies').delete().eq('id', id);
  if (error) throw error;
  await logAction('Xóa công nghệ', 'technology', id, '');
}
