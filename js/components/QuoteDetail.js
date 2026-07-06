const { ref, reactive, computed, onMounted } = Vue;
const { useRoute } = VueRouter;
import { getQuote, getQuoteItems, createQuote, updateQuote, nextVersionForProject, applyQuoteToProject } from '../api/quotes.js';
import { listProjects } from '../api/projects.js';
import { listModules } from '../api/modulesCatalog.js';
import { listTechnologies } from '../api/technologies.js';
import { getSettings } from '../api/settings.js';
import { state, can, toast } from '../state.js';
import { formatCurrency, formatDate, uid } from '../utils.js';

export default {
  name: 'QuoteDetail',
  setup() {
    const route = useRoute();
    const isNew = route.params.id === 'new';
    const loading = ref(true);
    const quote = ref(null);
    const projects = ref([]);
    const catalog = ref([]);
    const technologies = ref([]);
    const settings = ref(null);

    const projectId = ref(route.query.project || '');
    const note = ref('');
    const items = ref([]);
    const addModuleId = ref('');
    const addTechId = ref('');

    const selectedProject = computed(() => projects.value.find(p => p.id === projectId.value) || null);
    const subtotal = computed(() => items.value.reduce((s, i) => s + Number(i.price || 0), 0));
    const isApplied = computed(() => !!(quote.value && quote.value.applied_at));

    async function load() {
      loading.value = true;
      [projects.value, catalog.value, technologies.value, settings.value] = await Promise.all([
        listProjects(), listModules(), listTechnologies(), getSettings()
      ]);
      if (!isNew) {
        quote.value = await getQuote(route.params.id);
        projectId.value = quote.value.project_id;
        note.value = quote.value.note || '';
        const rawItems = await getQuoteItems(route.params.id);
        items.value = rawItems.map(i => ({ ...i, _key: i.id }));
      }
      loading.value = false;
    }

    function addModuleItem() {
      if (!addModuleId.value) return;
      const mod = catalog.value.find(m => m.id === addModuleId.value);
      items.value.push({ _key: uid(), module_id: mod.id, technology_id: null, name_snapshot: mod.name, price: mod.price, discount: 0, note: '' });
      addModuleId.value = '';
    }
    function addTechItem() {
      if (!addTechId.value) return;
      const tech = technologies.value.find(t => t.id === addTechId.value);
      items.value.push({ _key: uid(), module_id: null, technology_id: tech.id, name_snapshot: tech.name, price: tech.price, discount: 0, note: '' });
      addTechId.value = '';
    }
    function removeItem(idx) { items.value.splice(idx, 1); }

    async function saveDraft() {
      if (!projectId.value) { toast('Vui lòng chọn dự án', 'error'); return; }
      if (!items.value.length) { toast('Vui lòng thêm ít nhất 1 module hoặc công nghệ', 'error'); return; }
      const proj = selectedProject.value;
      const payload = {
        customer_id: proj.customer_id, project_id: projectId.value, note: note.value,
        discount_percent: 0, discount_amount: 0, subtotal: subtotal.value, total: subtotal.value,
        created_by: state.profile.id
      };
      const itemPayload = items.value.map(i => ({ module_id: i.module_id, technology_id: i.technology_id, name_snapshot: i.name_snapshot, price: i.price, discount: 0, note: i.note }));
      try {
        if (isNew) {
          payload.version_no = await nextVersionForProject(projectId.value);
          const created = await createQuote(payload, itemPayload);
          toast('Đã tạo báo giá');
          window.location.hash = '#/quotes/' + created.id;
        } else {
          await updateQuote(quote.value.id, payload);
          toast('Đã lưu báo giá');
          await load();
        }
      } catch (e) { toast(e.message, 'error'); }
    }

    async function markSent() {
      await updateQuote(quote.value.id, { status: 'da_gui' });
      toast('Đã đánh dấu gửi báo giá');
      await load();
    }

    async function createNewVersion() {
      const proj = selectedProject.value;
      const payload = {
        customer_id: proj.customer_id, project_id: projectId.value, note: note.value,
        discount_percent: 0, discount_amount: 0, subtotal: subtotal.value, total: subtotal.value,
        created_by: state.profile.id, version_no: await nextVersionForProject(projectId.value)
      };
      const itemPayload = items.value.map(i => ({ module_id: i.module_id, technology_id: i.technology_id, name_snapshot: i.name_snapshot, price: i.price, discount: 0, note: i.note }));
      const created = await createQuote(payload, itemPayload);
      toast('Đã tạo phiên bản báo giá mới');
      window.location.hash = '#/quotes/' + created.id;
    }

    async function doApply() {
      try {
        await applyQuoteToProject(quote.value.id);
        toast('Đã áp dụng báo giá vào dự án');
        await load();
      } catch (e) { toast(e.message, 'error'); }
    }

    function exportPdf() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const proj = selectedProject.value;
      doc.setFontSize(16);
      doc.text(settings.value?.company_name || 'BÁO GIÁ', 14, 15);
      doc.setFontSize(11);
      doc.text('Dự án: ' + (proj ? proj.name + ' (' + proj.code + ')' : ''), 14, 25);
      doc.text('Mã báo giá: ' + (quote.value?.code || '(chưa lưu)'), 14, 32);
      doc.autoTable({
        startY: 38,
        head: [['Hạng mục', 'Giá', 'Ghi chú']],
        body: items.value.map(i => [i.name_snapshot, formatCurrency(i.price), i.note || ''])
      });
      const y = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(13);
      doc.text('Thành tiền: ' + formatCurrency(subtotal.value), 14, y);
      doc.save((quote.value?.code || 'bao-gia') + '.pdf');
    }

    function printQuote() { window.print(); }

    onMounted(load);

    return {
      isNew, loading, quote, projects, catalog, technologies, projectId, selectedProject, note, items,
      addModuleId, addTechId, subtotal, isApplied, can,
      addModuleItem, addTechItem, removeItem, saveDraft, markSent, createNewVersion, doApply, exportPdf, printQuote,
      formatCurrency, formatDate
    };
  },
  template: `
    <div class="page" v-if="!loading">
      <div class="page-header no-print">
        <h2 class="page-title">{{ isNew ? 'Tạo báo giá mới' : 'Báo giá ' + quote.code + ' (v' + quote.version_no + ')' }}</h2>
        <a href="#/quotes" class="btn btn-sm">← Quay lại</a>
      </div>

      <div class="detail-card" id="quote-print-area">
        <div class="form-row no-print">
          <div class="form-group">
            <label>Dự án *</label>
            <select class="input" v-model="projectId" :disabled="!isNew">
              <option value="">-- Chọn mã dự án --</option>
              <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.code }} — {{ p.name }}</option>
            </select>
          </div>
        </div>
        <p v-if="selectedProject"><b>Khách hàng:</b> {{ selectedProject.customers?.company_name }}</p>
        <p v-if="isApplied" class="badge-green">Đã áp dụng vào dự án lúc {{ formatDate(quote.applied_at) }}</p>

        <h4>Module</h4>
        <div class="form-row no-print" v-if="can('quotes','can_edit') && !isApplied">
          <select class="input" v-model="addModuleId">
            <option value="">-- Chọn module --</option>
            <option v-for="m in catalog" :key="m.id" :value="m.id">{{ m.name }} ({{ formatCurrency(m.price) }})</option>
          </select>
          <button class="btn" @click="addModuleItem">+ Thêm module</button>
        </div>
        <h4>Công nghệ</h4>
        <div class="form-row no-print" v-if="can('quotes','can_edit') && !isApplied">
          <select class="input" v-model="addTechId">
            <option value="">-- Chọn công nghệ --</option>
            <option v-for="t in technologies" :key="t.id" :value="t.id">{{ t.name }} ({{ formatCurrency(t.price) }})</option>
          </select>
          <button class="btn" @click="addTechItem">+ Thêm công nghệ</button>
        </div>

        <table class="table">
          <thead><tr><th>Hạng mục</th><th>Loại</th><th>Giá</th><th>Ghi chú</th><th class="no-print"></th></tr></thead>
          <tbody>
            <tr v-for="(i, idx) in items" :key="i._key">
              <td>{{ i.name_snapshot }}</td>
              <td>{{ i.module_id ? 'Module' : 'Công nghệ' }}</td>
              <td>{{ formatCurrency(i.price) }}</td>
              <td><input class="input-sm no-print" v-model="i.note" /><span class="print-only">{{ i.note }}</span></td>
              <td class="no-print"><button v-if="!isApplied" class="btn btn-sm btn-danger" @click="removeItem(idx)">Xóa</button></td>
            </tr>
          </tbody>
        </table>

        <div class="form-group no-print">
          <label>Ghi chú</label>
          <textarea class="input" rows="2" v-model="note" :disabled="isApplied"></textarea>
        </div>

        <div class="quote-totals">
          <div class="quote-total-final">Thành tiền: {{ formatCurrency(subtotal) }}</div>
        </div>
      </div>

      <div class="action-row no-print">
        <button v-if="(can('quotes','can_add') || can('quotes','can_edit')) && !isApplied" class="btn btn-primary" @click="saveDraft">{{ isNew ? 'Tạo báo giá' : 'Lưu thay đổi' }}</button>
        <button v-if="!isNew && quote.status === 'nhap' && can('quotes','can_edit') && !isApplied" class="btn" @click="markSent">Đánh dấu đã gửi</button>
        <button v-if="!isNew && quote.project_id && !isApplied && can('quotes','can_edit')" class="btn btn-primary" @click="doApply">✓ Xác nhận làm (áp dụng vào dự án)</button>
        <button v-if="!isNew && can('quotes','can_add')" class="btn" @click="createNewVersion">Tạo phiên bản mới</button>
        <button v-if="can('quotes','can_export_pdf')" class="btn" @click="exportPdf">Xuất PDF</button>
        <button class="btn" @click="printQuote">In</button>
      </div>
    </div>
    <div v-else class="loading">Đang tải...</div>
  `
};
