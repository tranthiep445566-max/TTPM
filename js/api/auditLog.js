import { getClient } from '../supabaseClient.js';

export async function listAuditLog(limit = 200) {
  const sb = getClient();
  const { data, error } = await sb.from('audit_log').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}
