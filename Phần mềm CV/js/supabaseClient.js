const URL_KEY = 'sb_url';
const ANON_KEY = 'sb_anon_key';

// Publishable key: an toàn để public theo thiết kế của Supabase (RLS mới là lớp bảo mật thật sự).
// Không đặt secret key / service_role key ở đây hay bất kỳ đâu trong code phía client.
const DEFAULT_URL = 'https://xiezaynnzxhgpxduoxnp.supabase.co';
const DEFAULT_ANON_KEY = 'sb_publishable_97OrbgxPWz04tREbgUr45Q_KnitLC-5';

let client = null;

export function getConfig() {
  return {
    url: localStorage.getItem(URL_KEY) || DEFAULT_URL,
    anonKey: localStorage.getItem(ANON_KEY) || DEFAULT_ANON_KEY
  };
}

export function isConfigured() {
  const c = getConfig();
  return !!(c.url && c.anonKey);
}

export function saveConfig(url, anonKey) {
  localStorage.setItem(URL_KEY, url.trim());
  localStorage.setItem(ANON_KEY, anonKey.trim());
  client = null;
}

export function clearConfig() {
  localStorage.removeItem(URL_KEY);
  localStorage.removeItem(ANON_KEY);
  client = null;
}

export function getClient() {
  if (client) return client;
  const { url, anonKey } = getConfig();
  if (!url || !anonKey) throw new Error('Chua cau hinh Supabase');
  client = window.supabase.createClient(url, anonKey);
  return client;
}
