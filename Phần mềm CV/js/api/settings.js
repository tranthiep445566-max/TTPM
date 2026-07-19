import { getClient } from '../supabaseClient.js';
import { logAction } from '../auth.js';

export async function getSettings() {
  const sb = getClient();
  const { data, error } = await sb.from('company_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return data;
}

export async function updateSettings(payload) {
  const sb = getClient();
  const { data, error } = await sb.from('company_settings').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', 1).select().single();
  if (error) throw error;
  await logAction('Sửa cài đặt', 'settings', 1, '');
  return data;
}

export async function uploadLogo(file) {
  const sb = getClient();
  const path = `logo/${Date.now()}_${file.name}`;
  const { error: upErr } = await sb.storage.from('attachments').upload(path, file);
  if (upErr) throw upErr;
  const { data: pub } = sb.storage.from('attachments').getPublicUrl(path);
  return pub.publicUrl;
}
