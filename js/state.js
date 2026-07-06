const { reactive } = Vue;

export const state = reactive({
  session: null,
  profile: null,
  permissions: {},
  employees: [],
  notifications: [],
  unreadCount: 0,
  companySettings: null,
  toasts: []
});

const MODULE_KEYS = [
  'dashboard','customers','projects','quotes','modules_catalog','technologies',
  'employees','commissions','statistics','notifications','audit_log','permissions','settings'
];

export function can(moduleKey, action) {
  if (!state.profile) return false;
  if (state.profile.role === 'admin') return true;
  const perm = state.permissions[moduleKey];
  if (!perm) return false;
  return !!perm[action];
}

export function resetPermissionsFromRows(rows) {
  const map = {};
  MODULE_KEYS.forEach(m => {
    map[m] = { can_view: false, can_add: false, can_edit: false, can_delete: false, can_export_pdf: false, can_export_excel: false, can_approve_payment: false, can_approve_commission: false };
  });
  rows.forEach(r => { map[r.module] = r; });
  state.permissions = map;
}

let toastId = 0;
export function toast(message, type = 'success') {
  const id = ++toastId;
  state.toasts.push({ id, message, type });
  setTimeout(() => {
    const idx = state.toasts.findIndex(t => t.id === id);
    if (idx !== -1) state.toasts.splice(idx, 1);
  }, 3500);
}
