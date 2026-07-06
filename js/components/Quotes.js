const { ref, onMounted } = Vue;
import { listQuotes, deleteQuote } from '../api/quotes.js';
import { can, toast } from '../state.js';
import { formatCurrency, formatDate } from '../utils.js';
import DataTable from './common/DataTable.js';
import ConfirmDialog from './common/ConfirmDialog.js';

const COLUMNS = [
  { key: 'code', label: 'Mã báo giá', sortable: true },
  { key: 'customer', label: 'Khách hàng', format: r => r.customers?.company_name || '' },
  { key: 'project', label: 'Dự án', format: r => r.projects?.name || '—' },
  { key: 'version_no', label: 'Phiên bản', format: r => 'v' + r.version_no },
  { key: 'status', label: 'Trạng thái', format: r => r.status === 'nhap' ? 'Nháp' : 'Đã gửi' },
  { key: 'total', label: 'Tổng tiền', format: r => formatCurrency(r.total) },
  { key: 'created_at', label: 'Ngày tạo', format: r => formatDate(r.created_at) }
];

export default {
  name: 'Quotes',
  components: { DataTable, ConfirmDialog },
  setup() {
    const rows = ref([]);
    const loading = ref(true);
    const confirmOpen = ref(false);
    const toDelete = ref(null);

    async function load() {
      loading.value = true;
      rows.value = await listQuotes();
      loading.value = false;
    }

    function askDelete(row) { toDelete.value = row; confirmOpen.value = true; }
    async function doDelete() {
      try {
        await deleteQuote(toDelete.value.id);
        toast('Đã xóa báo giá');
        await load();
      } catch (e) { toast(e.message, 'error'); }
    }

    onMounted(load);
    return { rows, loading, confirmOpen, can, askDelete, doDelete, COLUMNS };
  },
  template: `
    <div class="page">
      <div class="page-header"><h2 class="page-title">Báo giá</h2></div>
      <div v-if="loading" class="loading">Đang tải...</div>
      <DataTable v-else :columns="COLUMNS" :rows="rows" :searchKeys="['code']">
        <template #toolbar>
          <a v-if="can('quotes','can_add')" class="btn btn-primary btn-sm" href="#/quotes/new">+ Tạo báo giá</a>
        </template>
        <template #col-code="{ row }"><a :href="'#/quotes/' + row.id">{{ row.code }}</a></template>
        <template #actions="{ row }">
          <a class="btn btn-sm" :href="'#/quotes/' + row.id">Xem</a>
          <button v-if="can('quotes','can_delete')" class="btn btn-sm btn-danger" @click="askDelete(row)">Xóa</button>
        </template>
      </DataTable>
      <ConfirmDialog v-model="confirmOpen" message="Xóa báo giá này?" @confirm="doDelete" />
    </div>
  `
};
