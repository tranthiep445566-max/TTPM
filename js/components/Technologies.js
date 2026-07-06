const { ref, reactive, computed, onMounted } = Vue;
import { listTechnologies, createTechnology, updateTechnology, deleteTechnology } from '../api/technologies.js';
import { can, toast } from '../state.js';
import { formatCurrency } from '../utils.js';
import DataTable from './common/DataTable.js';
import Modal from './common/Modal.js';
import ConfirmDialog from './common/ConfirmDialog.js';
import CurrencyInput from './common/CurrencyInput.js';

const COLUMNS = [
  { key: 'name', label: 'Tên công nghệ', sortable: true },
  { key: 'category', label: 'Nhóm', sortable: true },
  { key: 'price', label: 'Giá', sortable: true, format: r => formatCurrency(r.price) }
];

function emptyForm() { return { id: null, name: '', category: 'Khac', price: 0 }; }

export default {
  name: 'Technologies',
  components: { DataTable, Modal, ConfirmDialog, CurrencyInput },
  setup() {
    const rows = ref([]);
    const loading = ref(true);
    const modalOpen = ref(false);
    const editing = ref(false);
    const confirmOpen = ref(false);
    const toDelete = ref(null);
    const form = reactive(emptyForm());
    const newCategory = ref('');

    async function load() { loading.value = true; rows.value = await listTechnologies(); loading.value = false; }

    const categories = computed(() => [...new Set(['Backend', 'Frontend', 'Database', 'Khac', ...rows.value.map(r => r.category)].filter(Boolean))]);

    function openCreate() { Object.assign(form, emptyForm()); newCategory.value = ''; editing.value = false; modalOpen.value = true; }
    function openEdit(row) { Object.assign(form, row); newCategory.value = ''; editing.value = true; modalOpen.value = true; }

    async function save() {
      if (!form.name) { toast('Nhập tên công nghệ', 'error'); return; }
      const category = form.category === '__new__' ? newCategory.value.trim() : form.category;
      if (!category) { toast('Nhập tên nhóm mới', 'error'); return; }
      try {
        if (editing.value) await updateTechnology(form.id, { name: form.name, category, price: form.price });
        else await createTechnology({ name: form.name, category, price: form.price });
        toast('Đã lưu');
        modalOpen.value = false;
        await load();
      } catch (e) { toast(e.message, 'error'); }
    }

    function askDelete(row) { toDelete.value = row; confirmOpen.value = true; }
    async function doDelete() { await deleteTechnology(toDelete.value.id); toast('Đã xóa'); await load(); }

    onMounted(load);
    return { rows, loading, modalOpen, editing, confirmOpen, form, newCategory, categories, can, openCreate, openEdit, save, askDelete, doDelete, COLUMNS };
  },
  template: `
    <div class="page">
      <div class="page-header"><h2 class="page-title">Danh mục Công nghệ</h2></div>
      <div v-if="loading" class="loading">Đang tải...</div>
      <DataTable v-else :columns="COLUMNS" :rows="rows" :searchKeys="['name','category']">
        <template #toolbar>
          <button v-if="can('technologies','can_add')" class="btn btn-primary btn-sm" @click="openCreate">+ Thêm công nghệ</button>
        </template>
        <template #actions="{ row }">
          <button v-if="can('technologies','can_edit')" class="btn btn-sm" @click="openEdit(row)">Sửa</button>
          <button v-if="can('technologies','can_delete')" class="btn btn-sm btn-danger" @click="askDelete(row)">Xóa</button>
        </template>
      </DataTable>

      <Modal v-model="modalOpen" :title="editing ? 'Sửa công nghệ' : 'Thêm công nghệ'">
        <div class="form-group"><label>Tên công nghệ *</label><input class="input" v-model="form.name" /></div>
        <div class="form-group">
          <label>Nhóm</label>
          <select class="input" v-model="form.category">
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
            <option value="__new__">+ Tạo nhóm mới...</option>
          </select>
        </div>
        <div class="form-group" v-if="form.category === '__new__'">
          <label>Tên nhóm mới</label>
          <input class="input" v-model="newCategory" placeholder="VD: Mobile" />
        </div>
        <div class="form-group"><label>Giá</label><CurrencyInput v-model="form.price" /></div>
        <template #footer>
          <button class="btn" @click="modalOpen = false">Hủy</button>
          <button class="btn btn-primary" @click="save">Lưu</button>
        </template>
      </Modal>
      <ConfirmDialog v-model="confirmOpen" message="Xóa công nghệ này?" @confirm="doDelete" />
    </div>
  `
};
