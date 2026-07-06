const { ref, computed, onMounted } = Vue;
import { listAllPermissions, updatePermission } from '../api/permissions.js';
import { toast } from '../state.js';
import { MODULE_LABELS, roleLabel } from '../utils.js';

const ROLES = ['manager', 'sale', 'developer', 'accountant'];
const ACTIONS = [
  { key: 'can_view', label: 'Xem' },
  { key: 'can_add', label: 'Thêm' },
  { key: 'can_edit', label: 'Sửa' },
  { key: 'can_delete', label: 'Xóa' },
  { key: 'can_export_pdf', label: 'Xuất PDF' },
  { key: 'can_export_excel', label: 'Xuất Excel' },
  { key: 'can_approve_payment', label: 'Duyệt thanh toán' },
  { key: 'can_approve_commission', label: 'Duyệt hoa hồng' }
];

export default {
  name: 'PermissionsPage',
  setup() {
    const rows = ref([]);
    const loading = ref(true);
    const activeRole = ref('manager');

    async function load() { loading.value = true; rows.value = await listAllPermissions(); loading.value = false; }

    const rowsForRole = computed(() => rows.value.filter(r => r.role === activeRole.value));

    async function toggle(row, action) {
      const newVal = !row[action.key];
      row[action.key] = newVal;
      try {
        await updatePermission(row.role, row.module, { [action.key]: newVal });
      } catch (e) {
        row[action.key] = !newVal;
        toast(e.message, 'error');
      }
    }

    onMounted(load);
    return { rows, loading, activeRole, rowsForRole, ROLES, ACTIONS, MODULE_LABELS, roleLabel, toggle };
  },
  template: `
    <div class="page">
      <div class="page-header"><h2 class="page-title">Phân quyền</h2></div>
      <p class="muted">Admin luôn có toàn quyền. Chọn vai trò bên dưới để cấu hình quyền chi tiết theo từng module.</p>
      <div class="status-tabs">
        <button v-for="r in ROLES" :key="r" class="status-tab" :class="{ active: activeRole === r }" @click="activeRole = r">{{ roleLabel(r) }}</button>
      </div>
      <div v-if="loading" class="loading">Đang tải...</div>
      <div v-else class="table-wrap">
        <table class="table permissions-table">
          <thead>
            <tr><th>Module</th><th v-for="a in ACTIONS" :key="a.key">{{ a.label }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="row in rowsForRole" :key="row.module">
              <td>{{ MODULE_LABELS[row.module] || row.module }}</td>
              <td v-for="a in ACTIONS" :key="a.key" class="perm-cell">
                <input type="checkbox" :checked="row[a.key]" @change="toggle(row, a)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
};
