import { getClient } from '../supabaseClient.js';
import { logAction } from '../auth.js';

export async function listModules() {
  const sb = getClient();
  const { data, error } = await sb.from('modules_catalog').select('*, module_features(*)').order('group_name');
  if (error) throw error;
  return data;
}

export async function createModule(payload, features) {
  const sb = getClient();
  const { data, error } = await sb.from('modules_catalog').insert(payload).select().single();
  if (error) throw error;
  if (features && features.length) {
    await sb.from('module_features').insert(features.map(f => ({ module_id: data.id, name: f })));
  }
  await logAction('Tạo module', 'module_catalog', data.id, data.name);
  return data;
}

export async function updateModule(id, payload, features) {
  const sb = getClient();
  const { data, error } = await sb.from('modules_catalog').update(payload).eq('id', id).select().single();
  if (error) throw error;
  if (features) {
    await sb.from('module_features').delete().eq('module_id', id);
    if (features.length) await sb.from('module_features').insert(features.map(f => ({ module_id: id, name: f })));
  }
  await logAction('Sửa module', 'module_catalog', id, data.name);
  return data;
}

export async function deleteModule(id) {
  const sb = getClient();
  const { error } = await sb.from('modules_catalog').delete().eq('id', id);
  if (error) throw error;
  await logAction('Xóa module', 'module_catalog', id, '');
}

export async function duplicateModule(mod) {
  const sb = getClient();
  const { data, error } = await sb.from('modules_catalog').insert({
    name: mod.name + ' (bản sao)', group_name: mod.group_name, price: mod.price, difficulty: mod.difficulty, note: mod.note
  }).select().single();
  if (error) throw error;
  if (mod.module_features && mod.module_features.length) {
    await sb.from('module_features').insert(mod.module_features.map(f => ({ module_id: data.id, name: f.name })));
  }
  await logAction('Sao chép module', 'module_catalog', data.id, data.name);
  return data;
}
