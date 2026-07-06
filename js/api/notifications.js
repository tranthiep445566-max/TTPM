import { getClient } from '../supabaseClient.js';

export async function listNotifications() {
  const sb = getClient();
  const { data, error } = await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data;
}

export async function markRead(id) {
  const sb = getClient();
  const { error } = await sb.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllRead(ids) {
  const sb = getClient();
  const { error } = await sb.from('notifications').update({ is_read: true }).in('id', ids);
  if (error) throw error;
}

export async function createNotification(payload) {
  const sb = getClient();
  const { data, error } = await sb.from('notifications').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export function subscribeNotifications(onInsert) {
  const sb = getClient();
  const channel = sb.channel('notifications-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => onInsert(payload.new))
    .subscribe();
  return () => sb.removeChannel(channel);
}
