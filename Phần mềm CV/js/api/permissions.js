import { getClient } from '../supabaseClient.js';
import { logAction } from '../auth.js';

export async function listAllPermissions() {
  const sb = getClient();
  const { data, error } = await sb.from('role_permissions').select('*').order('role').order('module');
  if (error) throw error;
  return data;
}

export async function updatePermission(role, module, payload) {
  const sb = getClient();
  const { data, error } = await sb.from('role_permissions').update(payload).eq('role', role).eq('module', module).select().single();
  if (error) throw error;
  await logAction('Sửa phân quyền', 'role_permission', `${role}/${module}`, '');
  return data;
}
