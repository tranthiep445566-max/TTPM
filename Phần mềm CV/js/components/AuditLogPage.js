const { ref, onMounted } = Vue;
import { listAuditLog } from '../api/auditLog.js';
import { toast } from '../state.js';
import { formatDateTime } from '../utils.js';
import DataTable from './common/DataTable.js';

const COLUMNS = [
  { key: 'created_at', label: 'Thời gian', sortable: true, format: r => formatDateTime(r.created_at) },
  { key: 'user', label: 'Người thao tác', format: r => r.profiles?.full_name || 'Hệ thống' },
  { key: 'action', label: 'Hành động', sortable: true },
  { key: 'entity_type', label: 'Đối tượng' },
  { key: 'description', label: 'Nội dung' }
];

export default {
  name: 'AuditLogPage',
  components: { DataTable },
  setup() {
    const rows = ref([]);
    const loading = ref(true);
    async function load() {
      loading.value = true;
      try { rows.value = await listAuditLog(300); }
      catch (e) { toast(e.message, 'error'); }
      finally { loading.value = false; }
    }
    onMounted(load);
    return { rows, loading, COLUMNS };
  },
  template: `
    <div class="page">
      <div class="page-header"><h2 class="page-title">Nhật ký thao tác</h2></div>
      <div v-if="loading" class="loading">Đang tải...</div>
      <DataTable v-else :columns="COLUMNS" :rows="rows" :searchKeys="['action','entity_type','description']" />
    </div>
  `
};
