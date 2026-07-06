const { ref, reactive, onMounted } = Vue;
import { listEmployees, createEmployeeAccount, updateEmployee, setEmployeeActive, getEmployeeStats } from '../api/employees.js';
import { can, toast } from '../state.js';
import { formatCurrency, formatDate, roleLabel, ROLE_OPTIONS } from '../utils.js';
import DataTable from './common/DataTable.js';
import Modal from './common/Modal.js';
import ConfirmDialog from './common/ConfirmDialog.js';

const COLUMNS = [
  { key: 'employee_code', label: 'Mã NV', sortable: true },
  { key: 'full_name', label: 'Họ tên', sortable: true },
  { key: 'phone', label: 'Điện thoại' },
  { key: 'email', label: 'Email' },
  { key: 'position', label: 'Chức vụ' },
  { key: 'role', label: 'Vai trò', format: r => roleLabel(r.role) },
  { key: 'hire_date', label: 'Ngày vào làm', format: r => formatDate(r.hire_date) },
  { key: 'default_commission_percent', label: '% Hoa hồng', format: r => (r.default_commission_percent || 0) + '%' },
  { key: 'active', label: 'Trạng thái', format: r => r.active ? 'Đang làm' : 'Ngừng' }
];

function emptyCreateForm() { return { email: '', password: '', full_name: '', phone: '', position: '', role: 'sale', hire_date: '', default_commission_percent: 0 }; }
function emptyEditForm() { return { id: null, full_name: '', phone: '', position: '', role: 'sale', hire_date: '', default_commission_percent: 0, bank_name: '', bank_bin: '', bank_account_number: '', bank_account_holder: '' }; }

export default {
  name: 'Employees',
  components: { DataTable, Modal, ConfirmDialog },
  setup() {
    const rows = ref([]);
    const loading = ref(true);
    const createOpen = ref(false);
    const editOpen = ref(false);
    const statsOpen = ref(false);
    const confirmOpen = ref(false);
    const toDelete = ref(null);
    const createForm = reactive(emptyCreateForm());
    const editForm = reactive(emptyEditForm());
    const stats = ref(null);
    const statsTarget = ref(null);

    async function load() { loading.value = true; rows.value = await listEmployees(); loading.value = false; }

    function openCreate() { Object.assign(createForm, emptyCreateForm()); createOpen.value = true; }
    async function submitCreate() {
      if (!createForm.email || !createForm.password || !createForm.full_name) { toast('Nhập đủ email, mật khẩu, họ tên', 'error'); return; }
      try {
        await createEmployeeAccount(createForm);
        toast('Đã tạo nhân viên. Nếu bật xác thực email, nhân viên cần xác nhận email trước khi đăng nhập.');
        createOpen.value = false;
        await load();
      } catch (e) { toast(e.message, 'error'); }
    }

    function openEdit(row) {
      Object.assign(editForm, {
        id: row.id, full_name: row.full_name, phone: row.phone, position: row.position, role: row.role,
        hire_date: row.hire_date, default_commission_percent: row.default_commission_percent || 0,
        bank_name: row.bank_name, bank_bin: row.bank_bin,
        bank_account_number: row.bank_account_number, bank_account_holder: row.bank_account_holder
      });
      editOpen.value = true;
    }
    async function submitEdit() {
      try {
        await updateEmployee(editForm.id, editForm);
        toast('Đã cập nhật nhân viên');
        editOpen.value = false;
        await load();
      } catch (e) { toast(e.message, 'error'); }
    }

    async function openStats(row) {
      statsTarget.value = row;
      stats.value = await getEmployeeStats(row.id);
      statsOpen.value = true;
    }

    function askToggleActive(row) { toDelete.value = row; confirmOpen.value = true; }
    async function doToggleActive() {
      await setEmployeeActive(toDelete.value.id, !toDelete.value.active);
      toast('Đã cập nhật trạng thái');
      await load();
    }

    onMounted(load);
    return {
      rows, loading, createOpen, editOpen, statsOpen, confirmOpen, createForm, editForm, stats, statsTarget, toDelete,
      can, ROLE_OPTIONS, openCreate, submitCreate, openEdit, submitEdit, openStats, askToggleActive, doToggleActive,
      formatCurrency, COLUMNS
    };
  },
  template: `
    <div class="page">
      <div class="page-header"><h2 class="page-title">Nhân viên</h2></div>
      <div v-if="loading" class="loading">Đang tải...</div>
      <DataTable v-else :columns="COLUMNS" :rows="rows" :searchKeys="['employee_code','full_name','email']">
        <template #toolbar>
          <button v-if="can('employees','can_add')" class="btn btn-primary btn-sm" @click="openCreate">+ Thêm nhân viên</button>
        </template>
        <template #actions="{ row }">
          <button class="btn btn-sm" @click="openStats(row)">Thống kê</button>
          <button v-if="can('employees','can_edit')" class="btn btn-sm" @click="openEdit(row)">Sửa</button>
          <button v-if="can('employees','can_delete')" class="btn btn-sm btn-danger" @click="askToggleActive(row)">{{ row.active ? 'Ngừng' : 'Kích hoạt' }}</button>
        </template>
      </DataTable>

      <Modal v-model="createOpen" title="Thêm nhân viên">
        <div class="form-row">
          <div class="form-group"><label>Email *</label><input class="input" v-model="createForm.email" /></div>
          <div class="form-group"><label>Mật khẩu tạm *</label><input class="input" v-model="createForm.password" /></div>
        </div>
        <div class="form-group"><label>Họ tên *</label><input class="input" v-model="createForm.full_name" /></div>
        <div class="form-row">
          <div class="form-group"><label>Điện thoại</label><input class="input" v-model="createForm.phone" /></div>
          <div class="form-group"><label>Chức vụ</label><input class="input" v-model="createForm.position" /></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Vai trò</label>
            <select class="input" v-model="createForm.role"><option v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value">{{ r.label }}</option></select>
          </div>
          <div class="form-group"><label>Ngày vào làm</label><input class="input" type="date" v-model="createForm.hire_date" /></div>
        </div>
        <div class="form-group"><label>% Hoa hồng mặc định</label><input class="input" type="number" v-model.number="createForm.default_commission_percent" /></div>
        <template #footer>
          <button class="btn" @click="createOpen = false">Hủy</button>
          <button class="btn btn-primary" @click="submitCreate">Tạo</button>
        </template>
      </Modal>

      <Modal v-model="editOpen" title="Sửa nhân viên">
        <div class="form-group"><label>Họ tên</label><input class="input" v-model="editForm.full_name" /></div>
        <div class="form-row">
          <div class="form-group"><label>Điện thoại</label><input class="input" v-model="editForm.phone" /></div>
          <div class="form-group"><label>Chức vụ</label><input class="input" v-model="editForm.position" /></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Vai trò</label>
            <select class="input" v-model="editForm.role"><option v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value">{{ r.label }}</option></select>
          </div>
          <div class="form-group"><label>Ngày vào làm</label><input class="input" type="date" v-model="editForm.hire_date" /></div>
        </div>
        <div class="form-group"><label>% Hoa hồng mặc định</label><input class="input" type="number" v-model.number="editForm.default_commission_percent" /></div>
        <h4>Tài khoản ngân hàng (để nhận hoa hồng)</h4>
        <div class="form-row">
          <div class="form-group"><label>Ngân hàng</label><input class="input" v-model="editForm.bank_name" /></div>
          <div class="form-group"><label>Mã BIN ngân hàng</label><input class="input" v-model="editForm.bank_bin" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Số tài khoản</label><input class="input" v-model="editForm.bank_account_number" /></div>
          <div class="form-group"><label>Chủ tài khoản</label><input class="input" v-model="editForm.bank_account_holder" /></div>
        </div>
        <template #footer>
          <button class="btn" @click="editOpen = false">Hủy</button>
          <button class="btn btn-primary" @click="submitEdit">Lưu</button>
        </template>
      </Modal>

      <Modal v-model="statsOpen" :title="'Thống kê: ' + (statsTarget?.full_name || '')">
        <div v-if="stats">
          <p><b>Dự án đang phụ trách:</b> {{ stats.active }}</p>
          <p><b>Dự án hoàn thành:</b> {{ stats.done }}</p>
          <p><b>Doanh số:</b> {{ formatCurrency(stats.revenue) }}</p>
          <p><b>Hoa hồng:</b> {{ formatCurrency(stats.totalCommission) }}</p>
        </div>
      </Modal>

      <ConfirmDialog v-model="confirmOpen" message="Xác nhận thay đổi trạng thái nhân viên này?" @confirm="doToggleActive" />
    </div>
  `
};
