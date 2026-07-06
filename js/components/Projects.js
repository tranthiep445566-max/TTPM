const { ref, computed, onMounted, reactive } = Vue;
import { listProjects, createProject, deleteProject } from '../api/projects.js';
import { listCustomers } from '../api/customers.js';
import { listEmployees } from '../api/employees.js';
import { can, toast, state } from '../state.js';
import { formatCurrency, formatDate, daysLeft, statusLabel, PROJECT_STATUS_OPTIONS, exportRowsToExcel, exportRowsToPdf, buildVietQrUrl } from '../utils.js';
import DataTable from './common/DataTable.js';
import Modal from './common/Modal.js';
import ConfirmDialog from './common/ConfirmDialog.js';
import CurrencyInput from './common/CurrencyInput.js';

const COLUMNS = [
  { key: 'code', label: 'Mã DA', sortable: true },
  { key: 'name', label: 'Tên dự án', sortable: true },
  { key: 'customer', label: 'Khách hàng', format: r => r.customers?.company_name || '' },
  { key: 'assignee', label: 'Người phụ trách', format: r => r.profiles?.full_name || '' },
  { key: 'status', label: 'Trạng thái', format: r => statusLabel(r.status) },
  { key: 'total_amount', label: 'Tổng tiền', format: r => formatCurrency(r.total_amount) },
  { key: 'debt', label: 'Công nợ', format: r => formatCurrency(r.financials?.debt_amount) },
  { key: 'deadline_date', label: 'Hạn bàn giao', format: r => formatDate(r.deadline_date) }
];

function emptyForm() {
  return { name: '', customer_id: '', assignee_id: '', software_type: '', industry: '' };
}

export default {
  name: 'Projects',
  components: { DataTable, Modal, ConfirmDialog, CurrencyInput },
  setup() {
    const rows = ref([]);
    const customers = ref([]);
    const employees = ref([]);
    const loading = ref(true);
    const statusFilter = ref('');
    const modalOpen = ref(false);
    const confirmOpen = ref(false);
    const toDelete = ref(null);
    const form = reactive(emptyForm());
    const qrOpen = ref(false);
    const qrProject = ref(null);
    const qrAmount = ref(0);

    const filteredRows = computed(() => statusFilter.value ? rows.value.filter(r => r.status === statusFilter.value) : rows.value);

    async function load() {
      loading.value = true;
      [rows.value, customers.value, employees.value] = await Promise.all([listProjects(), listCustomers(), listEmployees()]);
      loading.value = false;
    }

    function openCreate() {
      Object.assign(form, emptyForm());
      modalOpen.value = true;
    }

    async function save() {
      if (!form.name || !form.customer_id) { toast('Vui lòng nhập tên dự án và chọn khách hàng', 'error'); return; }
      try {
        const created = await createProject({ ...form, created_by: state.profile.id });
        toast('Đã tạo dự án');
        modalOpen.value = false;
        window.location.hash = '#/projects/' + created.id;
      } catch (e) {
        toast(e.message, 'error');
      }
    }

    function askDelete(row) { toDelete.value = row; confirmOpen.value = true; }
    async function doDelete() {
      try {
        await deleteProject(toDelete.value.id);
        toast('Đã xóa dự án');
        await load();
      } catch (e) {
        toast(e.message, 'error');
      }
    }

    function doExportExcel() { exportRowsToExcel(filteredRows.value, COLUMNS, 'du-an'); }
    function doExportPdf() { exportRowsToPdf(filteredRows.value, COLUMNS, 'du-an', 'Danh sách dự án'); }

    function openQr(row) {
      qrProject.value = row;
      qrAmount.value = Number(row.financials?.debt_amount) || Number(row.total_amount) || 0;
      qrOpen.value = true;
    }
    const qrUrl = computed(() => qrProject.value ? buildVietQrUrl(state.companySettings, qrAmount.value, qrProject.value.code) : '');

    onMounted(load);

    return { rows, filteredRows, customers, employees, loading, statusFilter, modalOpen, confirmOpen, form,
      qrOpen, qrProject, qrAmount, qrUrl, openQr,
      PROJECT_STATUS_OPTIONS, can, openCreate, save, askDelete, doDelete, doExportExcel, doExportPdf, COLUMNS };
  },
  template: `
    <div class="page">
      <div class="page-header">
        <h2 class="page-title">Dự án</h2>
      </div>
      <div class="status-tabs">
        <button class="status-tab" :class="{ active: statusFilter === '' }" @click="statusFilter = ''">Tất cả ({{ rows.length }})</button>
        <button v-for="s in PROJECT_STATUS_OPTIONS" :key="s.value" class="status-tab" :class="{ active: statusFilter === s.value }" @click="statusFilter = s.value">
          {{ s.label }} ({{ rows.filter(r => r.status === s.value).length }})
        </button>
      </div>
      <div v-if="loading" class="loading">Đang tải...</div>
      <DataTable v-else :columns="COLUMNS" :rows="filteredRows" :searchKeys="['code','name']">
        <template #toolbar>
          <button v-if="can('projects','can_export_excel')" class="btn btn-sm" @click="doExportExcel">Xuất Excel</button>
          <button v-if="can('projects','can_export_pdf')" class="btn btn-sm" @click="doExportPdf">Xuất PDF</button>
          <button v-if="can('projects','can_add')" class="btn btn-primary btn-sm" @click="openCreate">+ Thêm dự án</button>
        </template>
        <template #col-name="{ row }"><a :href="'#/projects/' + row.id">{{ row.name }}</a></template>
        <template #col-status="{ row }"><span class="status-badge">{{ COLUMNS.find(c=>c.key==='status').format(row) }}</span></template>
        <template #actions="{ row }">
          <a class="btn btn-sm" :href="'#/projects/' + row.id">Xem</a>
          <button class="btn btn-sm" @click="openQr(row)">QR</button>
          <button v-if="can('projects','can_delete')" class="btn btn-sm btn-danger" @click="askDelete(row)">Xóa</button>
        </template>
      </DataTable>

      <Modal v-model="modalOpen" title="Thêm dự án mới">
        <div class="form-group"><label>Tên dự án *</label><input class="input" v-model="form.name" /></div>
        <div class="form-group">
          <label>Khách hàng *</label>
          <select class="input" v-model="form.customer_id">
            <option value="">-- Chọn khách hàng --</option>
            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.company_name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Người phụ trách</label>
          <select class="input" v-model="form.assignee_id">
            <option value="">-- Chọn nhân viên --</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.full_name }}</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Loại phần mềm</label><input class="input" v-model="form.software_type" /></div>
          <div class="form-group"><label>Ngành nghề</label><input class="input" v-model="form.industry" /></div>
        </div>
        <template #footer>
          <button class="btn" @click="modalOpen = false">Hủy</button>
          <button class="btn btn-primary" @click="save">Tạo dự án</button>
        </template>
      </Modal>

      <ConfirmDialog v-model="confirmOpen" message="Xóa dự án này?" @confirm="doDelete" />

      <Modal v-model="qrOpen" :title="'Mã QR thanh toán — ' + (qrProject?.code || '')">
        <div class="form-group"><label>Số tiền</label><CurrencyInput v-model="qrAmount" /></div>
        <div class="qr-pay-box">
          <img v-if="qrUrl" :src="qrUrl" class="qr-image" />
          <p v-else class="muted">Chưa cấu hình tài khoản ngân hàng trong Cài đặt.</p>
          <p class="muted small">Nội dung chuyển khoản: {{ qrProject?.code }}</p>
        </div>
        <template #footer>
          <button class="btn" @click="qrOpen = false">Đóng</button>
        </template>
      </Modal>
    </div>
  `
};
