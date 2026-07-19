const { ref, reactive, onMounted } = Vue;
import { listModules, createModule, updateModule, deleteModule, duplicateModule } from '../api/modulesCatalog.js';
import { can, toast } from '../state.js';
import { formatCurrency, DIFFICULTY_OPTIONS, difficultyLabel, difficultyBadgeClass } from '../utils.js';
import DataTable from './common/DataTable.js';
import Modal from './common/Modal.js';
import ConfirmDialog from './common/ConfirmDialog.js';
import CurrencyInput from './common/CurrencyInput.js';

const COLUMNS = [
  { key: 'name', label: 'Tên Module', sortable: true },
  { key: 'group_name', label: 'Nhóm Module', sortable: true },
  { key: 'features', label: 'Chức năng', format: r => (r.module_features || []).length + ' chức năng' },
  { key: 'difficulty', label: 'Độ khó', sortable: true },
  { key: 'price', label: 'Giá', sortable: true, format: r => formatCurrency(r.price) },
  { key: 'note', label: 'Ghi chú' }
];

function emptyForm() { return { id: null, name: '', group_name: '', price: 0, difficulty: 'trung_binh', note: '', featuresText: '' }; }

export default {
  name: 'ModulesCatalog',
  components: { DataTable, Modal, ConfirmDialog, CurrencyInput },
  setup() {
    const rows = ref([]);
    const loading = ref(true);
    const modalOpen = ref(false);
    const editing = ref(false);
    const confirmOpen = ref(false);
    const toDelete = ref(null);
    const form = reactive(emptyForm());
    const featuresViewOpen = ref(false);
    const featuresViewTarget = ref(null);

    async function load() {
      loading.value = true;
      try {
        rows.value = await listModules();
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        loading.value = false;
      }
    }

    function openCreate() { Object.assign(form, emptyForm()); editing.value = false; modalOpen.value = true; }
    function openEdit(row) {
      Object.assign(form, { id: row.id, name: row.name, group_name: row.group_name, price: row.price, difficulty: row.difficulty || 'trung_binh', note: row.note,
        featuresText: (row.module_features || []).map(f => f.name).join('\n') });
      editing.value = true; modalOpen.value = true;
    }

    function viewFeatures(row) { featuresViewTarget.value = row; featuresViewOpen.value = true; }

    async function save() {
      if (!form.name) { toast('Nhập tên module', 'error'); return; }
      const features = form.featuresText.split('\n').map(f => f.trim()).filter(Boolean);
      const payload = { name: form.name, group_name: form.group_name, price: form.price, difficulty: form.difficulty, note: form.note };
      try {
        if (editing.value) { await updateModule(form.id, payload, features); toast('Đã cập nhật module'); }
        else { await createModule(payload, features); toast('Đã thêm module'); }
        modalOpen.value = false;
        await load();
      } catch (e) { toast(e.message, 'error'); }
    }

    async function doDuplicate(row) {
      await duplicateModule(row);
      toast('Đã sao chép module');
      await load();
    }

    function askDelete(row) { toDelete.value = row; confirmOpen.value = true; }
    async function doDelete() {
      await deleteModule(toDelete.value.id);
      toast('Đã xóa module');
      await load();
    }

    onMounted(load);
    return { rows, loading, modalOpen, editing, confirmOpen, form, can, featuresViewOpen, featuresViewTarget,
      openCreate, openEdit, viewFeatures, save, doDuplicate, askDelete, doDelete, COLUMNS,
      DIFFICULTY_OPTIONS, difficultyLabel, difficultyBadgeClass };
  },
  template: `
    <div class="page">
      <div class="page-header"><h2 class="page-title">Danh mục Module</h2></div>
      <div v-if="loading" class="loading">Đang tải...</div>
      <DataTable v-else :columns="COLUMNS" :rows="rows" :searchKeys="['name','group_name']">
        <template #toolbar>
          <button v-if="can('modules_catalog','can_add')" class="btn btn-primary btn-sm" @click="openCreate">+ Thêm Module</button>
        </template>
        <template #col-features="{ row }">
          {{ (row.module_features || []).length }} chức năng
          <button class="btn btn-sm" @click="viewFeatures(row)">Xem</button>
        </template>
        <template #col-difficulty="{ row }">
          <span class="difficulty-badge" :class="difficultyBadgeClass(row.difficulty)">{{ difficultyLabel(row.difficulty) }}</span>
        </template>
        <template #actions="{ row }">
          <button v-if="can('modules_catalog','can_add')" class="btn btn-sm" @click="doDuplicate(row)">Sao chép</button>
          <button v-if="can('modules_catalog','can_edit')" class="btn btn-sm" @click="openEdit(row)">Sửa</button>
          <button v-if="can('modules_catalog','can_delete')" class="btn btn-sm btn-danger" @click="askDelete(row)">Xóa</button>
        </template>
      </DataTable>

      <Modal v-model="modalOpen" :title="editing ? 'Sửa Module' : 'Thêm Module'">
        <div class="form-row">
          <div class="form-group"><label>Tên Module *</label><input class="input" v-model="form.name" /></div>
          <div class="form-group"><label>Nhóm Module</label><input class="input" v-model="form.group_name" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Giá</label><CurrencyInput v-model="form.price" /></div>
          <div class="form-group">
            <label>Độ khó (hiển thị trên phiếu báo giá)</label>
            <select class="input" v-model="form.difficulty">
              <option v-for="d in DIFFICULTY_OPTIONS" :key="d.value" :value="d.value">{{ d.label }}</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Danh sách chức năng (mỗi dòng 1 chức năng)</label>
          <textarea class="input" rows="5" v-model="form.featuresText"></textarea>
        </div>
        <div class="form-group"><label>Ghi chú</label><textarea class="input" rows="2" v-model="form.note"></textarea></div>
        <template #footer>
          <button class="btn" @click="modalOpen = false">Hủy</button>
          <button class="btn btn-primary" @click="save">Lưu</button>
        </template>
      </Modal>

      <Modal v-model="featuresViewOpen" :title="'Chức năng: ' + (featuresViewTarget?.name || '')">
        <ul v-if="featuresViewTarget && featuresViewTarget.module_features && featuresViewTarget.module_features.length">
          <li v-for="f in featuresViewTarget.module_features" :key="f.id">{{ f.name }}</li>
        </ul>
        <p v-else class="muted">Chưa có chức năng nào</p>
      </Modal>

      <ConfirmDialog v-model="confirmOpen" message="Xóa module này?" @confirm="doDelete" />
    </div>
  `
};
