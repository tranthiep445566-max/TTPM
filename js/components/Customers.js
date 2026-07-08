const { ref, onMounted, reactive } = Vue;
import { listCustomers, createCustomer, updateCustomer, deleteCustomer } from '../api/customers.js';
import { can, toast } from '../state.js';
import { exportRowsToExcel, exportRowsToPdf } from '../utils.js';
import DataTable from './common/DataTable.js';
import Modal from './common/Modal.js';
import ConfirmDialog from './common/ConfirmDialog.js';

const COLUMNS = [
  { key: 'code', label: 'Mã KH', sortable: true },
  { key: 'company_name', label: 'Tên công ty', sortable: true },
  { key: 'contact_person', label: 'Người liên hệ' },
  { key: 'phone', label: 'Điện thoại' },
  { key: 'email', label: 'Email' },
  { key: 'industry', label: 'Ngành nghề' }
];

function emptyForm() {
  return { id: null, company_name: '', contact_person: '', phone: '', email: '', industry: '', note: '' };
}

export default {
  name: 'Customers',
  components: { DataTable, Modal, ConfirmDialog },
  setup() {
    const rows = ref([]);
    const loading = ref(true);
    const modalOpen = ref(false);
    const confirmOpen = ref(false);
    const toDelete = ref(null);
    const editing = ref(false);
    const form = reactive(emptyForm());

    async function load() {
      loading.value = true;
      try {
        rows.value = await listCustomers();
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        loading.value = false;
      }
    }

    function openCreate() {
      Object.assign(form, emptyForm());
      editing.value = false;
      modalOpen.value = true;
    }

    function openEdit(row) {
      Object.assign(form, row);
      editing.value = true;
      modalOpen.value = true;
    }

    async function save() {
      try {
        if (editing.value) {
          await updateCustomer(form.id, {
            company_name: form.company_name, contact_person: form.contact_person, phone: form.phone,
            email: form.email, industry: form.industry, note: form.note
          });
          toast('Đã cập nhật khách hàng');
        } else {
          await createCustomer({
            company_name: form.company_name, contact_person: form.contact_person, phone: form.phone,
            email: form.email, industry: form.industry, note: form.note
          });
          toast('Đã thêm khách hàng');
        }
        modalOpen.value = false;
        await load();
      } catch (e) {
        toast(e.message, 'error');
      }
    }

    function askDelete(row) { toDelete.value = row; confirmOpen.value = true; }
    async function doDelete() {
      try {
        await deleteCustomer(toDelete.value.id);
        toast('Đã xóa khách hàng');
        await load();
      } catch (e) {
        toast(e.message, 'error');
      }
    }

    function doExportExcel() {
      exportRowsToExcel(rows.value, COLUMNS, 'khach-hang');
    }
    function doExportPdf() {
      exportRowsToPdf(rows.value, COLUMNS, 'khach-hang', 'Danh sách khách hàng');
    }

    onMounted(load);

    return { rows, loading, COLUMNS, modalOpen, confirmOpen, editing, form, can,
      openCreate, openEdit, save, askDelete, doDelete, doExportExcel, doExportPdf };
  },
  template: `
    <div class="page">
      <div class="page-header">
        <h2 class="page-title">Khách hàng</h2>
      </div>
      <div v-if="loading" class="loading">Đang tải...</div>
      <DataTable v-else :columns="COLUMNS" :rows="rows" :searchKeys="['code','company_name','contact_person','phone','email']">
        <template #toolbar>
          <button v-if="can('customers','can_export_excel')" class="btn btn-sm" @click="doExportExcel">Xuất Excel</button>
          <button v-if="can('customers','can_export_pdf')" class="btn btn-sm" @click="doExportPdf">Xuất PDF</button>
          <button v-if="can('customers','can_add')" class="btn btn-primary btn-sm" @click="openCreate">+ Thêm khách hàng</button>
        </template>
        <template #col-company_name="{ row }">
          <a :href="'#/customers/' + row.id">{{ row.company_name }}</a>
        </template>
        <template #actions="{ row }">
          <a class="btn btn-sm" :href="'#/customers/' + row.id">Xem</a>
          <button v-if="can('customers','can_edit')" class="btn btn-sm" @click="openEdit(row)">Sửa</button>
          <button v-if="can('customers','can_delete')" class="btn btn-sm btn-danger" @click="askDelete(row)">Xóa</button>
        </template>
      </DataTable>

      <Modal v-model="modalOpen" :title="editing ? 'Sửa khách hàng' : 'Thêm khách hàng'">
        <div class="form-group"><label>Tên công ty *</label><input class="input" v-model="form.company_name" /></div>
        <div class="form-row">
          <div class="form-group"><label>Người liên hệ</label><input class="input" v-model="form.contact_person" /></div>
          <div class="form-group"><label>Điện thoại</label><input class="input" v-model="form.phone" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Email</label><input class="input" v-model="form.email" /></div>
          <div class="form-group"><label>Ngành nghề</label><input class="input" v-model="form.industry" /></div>
        </div>
        <div class="form-group"><label>Ghi chú</label><textarea class="input" rows="3" v-model="form.note"></textarea></div>
        <template #footer>
          <button class="btn" @click="modalOpen = false">Hủy</button>
          <button class="btn btn-primary" @click="save">Lưu</button>
        </template>
      </Modal>

      <ConfirmDialog v-model="confirmOpen" message="Xóa khách hàng này? Toàn bộ dự án/báo giá liên quan cũng bị ảnh hưởng." @confirm="doDelete" />
    </div>
  `
};
