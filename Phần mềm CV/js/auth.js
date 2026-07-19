import { getClient } from './supabaseClient.js';
import { state, resetPermissionsFromRows } from './state.js';

export async function signIn(email, password) {
  const sb = getClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  state.session = data.session;
  await loadProfileAndPermissions();
  return data;
}

export async function changePassword(newPassword) {
  const sb = getClient();
  const { error } = await sb.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut() {
  const sb = getClient();
  await sb.auth.signOut();
  state.session = null;
  state.profile = null;
  state.permissions = {};
}

export async function restoreSession() {
  const sb = getClient();
  const { data } = await sb.auth.getSession();
  state.session = data.session;
  if (state.session) await loadProfileAndPermissions();
  return state.session;
}

export async function loadProfileAndPermissions() {
  const sb = getClient();
  const { data: profile, error } = await sb.from('profiles').select('*').eq('id', state.session.user.id).single();
  if (error) throw error;
  state.profile = profile;
  const { data: perms } = await sb.from('role_permissions').select('*').eq('role', profile.role);
  resetPermissionsFromRows(perms || []);
}

export async function logAction(action, entityType, entityId, description) {
  const sb = getClient();
  await sb.from('audit_log').insert({
    user_id: state.profile ? state.profile.id : null,
    action, entity_type: entityType, entity_id: entityId ? String(entityId) : null, description
  });
}
