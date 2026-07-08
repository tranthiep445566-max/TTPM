const { ref, reactive, computed, onMounted } = Vue;
const { useRoute } = VueRouter;
import {
  getProject, updateProject, listProjectModules, addProjectModule, removeProjectModule,
  listProjectTechnologies, setProjectTechnologies, listInstallments, addInstallment,
  deleteInstallment, confirmInstallmentPaid, listAttachments, getProjectFinancials
} from '../api/projects.js';
import { listCustomers, uploadAttachment } from '../api/customers.js';
import { listEmployees } from '../api/employees.js';
import { listModules } from '../api/modulesCatalog.js';
import { listTechnologies } from '../api/technologies.js';
import { listQuotesForProject } from '../api/quotes.js';
import { state, can, toast } from '../state.js';
import { formatCurrency, formatDate, daysLeft, statusLabel, PROJECT_STATUS_OPTIONS, buildVietQrUrl } from '../utils.js';
import Modal from './common/Modal.js';
import ConfirmDialog from './common/ConfirmDialog.js';
import CurrencyInput from './common/CurrencyInput.js';

export default {
  name: 'ProjectDetail',
  components: { Modal, ConfirmDialog, CurrencyInput },
  setup() {
    const route = useRoute();
    const projectId = route.params.id;
    const project = ref(null);
    const financials = ref({ paid_amount: 0, debt_amount: 0 });
    const customers = ref([]);
    const employees = ref([]);
    const catalog = ref([]);
    const technologies = ref([]);
    const projectModules = ref([]);
    const selectedTechIds = ref([]);
    const installments = ref([]);
    const attachments = ref([]);
    const quotes = ref([]);
    const loading = ref(true);
    const activeTab = ref('info');

    const info = reactive({ name: '', customer_id: '', assignee_id: '', software_type: '', industry: '', description: '', status: 'cho_bao_gia' });
    const finance = reactive({ total_amount: 0, deposit_amount: 0 });
    const timeline = reactive({ start_date: '', deadline_date: '', delivery_date: '', warranty_months: 0, warranty_end_date: '' });

    const addModuleId = ref('');
    const newInstallment = reactive({ name: '', percent: null, amount: 0 });
    const payingInstallment = ref(null);
    const confirmPayOpen = ref(false);
    const uploading = ref(false);

    const deadlineDaysLeft = computed(() => timeline.deadline_date ? daysLeft(timeline.deadline_date) : null);
    const warrantyDaysLeft = computed(() => timeline.warranty_end_date ? daysLeft(timeline.warranty_end_date) : null);
    const modulesTotal = computed(() => projectModules.value.reduce((s, m) => s + Number(m.price || 0), 0));
    const remainingToAllocate = computed(() => Number(finance.total_amount || 0) - installments.value.reduce((s, i) => s + Number(i.amount || 0), 0));
    const unpaidInstallments = computed(() => installments.value.filter(i => i.status === 'chua_thanh_toan'));

    async function load() {
      loading.value = true;
      try {
        project.value = await getProject(projectId);
        Object.assign(info, {
          name: project.value.name, customer_id: project.value.customer_id, assignee_id: project.value.assignee_id || '',
          software_type: project.value.software_type || '', industry: project.value.industry || '',
          description: project.value.description || '', status: project.value.status
        });
        Object.assign(finance, { total_amount: project.value.total_amount, deposit_amount: project.value.deposit_amount });
        Object.assign(timeline, {
          start_date: project.value.start_date || '', deadline_date: project.value.deadline_date || '',
          delivery_date: project.value.delivery_date || '', warranty_months: project.value.warranty_months || 0,
          warranty_end_date: project.value.warranty_end_date || ''
        });
        const [fin, custs, emps, cat, techs, pMods, techRows, insts, atts, qts] = await Promise.all([
          getProjectFinancials(projectId), listCustomers(), listEmployees(), listModules(), listTechnologies(),
          listProjectModules(projectId), listProjectTechnologies(projectId), listInstallments(projectId), listAttachments(projectId),
          listQuotesForProject(projectId)
        ]);
        financials.value = fin;
        customers.value = custs;
        employees.value = emps;
        catalog.value = cat;
        technologies.value = techs;
        projectModules.value = pMods;
        selectedTechIds.value = techRows.map(t => t.technology_id);
        installments.value = insts;
        attachments.value = atts;
        quotes.value = qts;
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        loading.value = false;
      }
    }

    async function saveInfo() {
      try {
        await updateProject(projectId, info);
        toast('Đã lưu thông tin dự án');
        await load();
      } catch (e) { toast(e.message, 'error'); }
    }

    async function addModule() {
      if (!addModuleId.value) return;
      const mod = catalog.value.find(m => m.id === addModuleId.value);
      try {
        await addProjectModule({ project_id: projectId, module_id: mod.id, name_snapshot: mod.name, price: mod.price, note: '' });
        addModuleId.value = '';
        projectModules.value = await listProjectModules(projectId);
        toast('Đã thêm module');
      } catch (e) { toast(e.message, 'error'); }
    }

    async function removeModule(id) {
      await removeProjectModule(id);
      projectModules.value = await listProjectModules(projectId);
    }

    async function applyModulesTotal() {
      finance.total_amount = modulesTotal.value;
      await updateProject(projectId, { total_amount: finance.total_amount });
      toast('Đã cập nhật tổng tiền theo module');
    }

    async function toggleTech(id) {
      const idx = selectedTechIds.value.indexOf(id);
      if (idx === -1) selectedTechIds.value.push(id); else selectedTechIds.value.splice(idx, 1);
      await setProjectTechnologies(projectId, selectedTechIds.value);
    }

    async function saveFinance() {
      try {
        await updateProject(projectId, finance);
        toast('Đã lưu thông tin tài chính');
        financials.value = await getProjectFinancials(projectId);
      } catch (e) { toast(e.message, 'error'); }
    }

    function applyPercent() {
      if (newInstallment.percent != null) {
        newInstallment.amount = Math.round(Number(finance.total_amount || 0) * Number(newInstallment.percent) / 100);
      }
    }

    async function submitInstallment() {
      if (!newInstallment.name || !newInstallment.amount) { toast('Nhập tên đợt và số tiền', 'error'); return; }
      try {
        await addInstallment({
          project_id: projectId, name: newInstallment.name, percent: newInstallment.percent,
          amount: newInstallment.amount, sort_order: installments.value.length
        });
        Object.assign(newInstallment, { name: '', percent: null, amount: 0 });
        installments.value = await listInstallments(projectId);
        toast('Đã thêm đợt thanh toán');
      } catch (e) { toast(e.message, 'error'); }
    }

    async function removeInstallment(id) {
      await deleteInstallment(id);
      installments.value = await listInstallments(projectId);
    }

    function openPay(inst) {
      payingInstallment.value = inst;
    }

    function askConfirmPay() { confirmPayOpen.value = true; }

    async function doConfirmPay() {
      try {
        await confirmInstallmentPaid(payingInstallment.value.id, state.profile.id);
        toast('Đã xác nhận thanh toán');
        payingInstallment.value = null;
        installments.value = await listInstallments(projectId);
        financials.value = await getProjectFinancials(projectId);
      } catch (e) { toast(e.message, 'error'); }
    }

    const qrUrl = computed(() => {
      if (!payingInstallment.value) return '';
      return buildVietQrUrl(state.companySettings, payingInstallment.value.amount, project.value?.code || '');
    });

    async function saveTimeline() {
      try {
        await updateProject(projectId, timeline);
        toast('Đã lưu thời gian');
      } catch (e) { toast(e.message, 'error'); }
    }

    function autoWarrantyEnd() {
      if (!timeline.delivery_date) { toast('Chưa có ngày bàn giao', 'error'); return; }
      const d = new Date(timeline.delivery_date);
      d.setMonth(d.getMonth() + Number(timeline.warranty_months || 0));
      timeline.warranty_end_date = d.toISOString().slice(0, 10);
    }

    async function onFileChange(e) {
      const file = e.target.files[0];
      if (!file) return;
      uploading.value = true;
      try {
        await uploadAttachment('project', projectId, file, state.profile.id);
        attachments.value = await listAttachments(projectId);
        toast('Đã tải lên file');
      } catch (err) { toast(err.message, 'error'); } finally { uploading.value = false; e.target.value = ''; }
    }

    onMounted(load);

    return {
      project, financials, customers, employees, catalog, technologies, projectModules, selectedTechIds,
      installments, attachments, quotes, loading, activeTab, info, finance, timeline, addModuleId, newInstallment,
      payingInstallment, confirmPayOpen, uploading, deadlineDaysLeft, warrantyDaysLeft, modulesTotal,
      remainingToAllocate, unpaidInstallments, qrUrl, can, PROJECT_STATUS_OPTIONS,
      saveInfo, addModule, removeModule, applyModulesTotal, toggleTech, saveFinance, applyPercent,
      submitInstallment, removeInstallment, openPay, askConfirmPay, doConfirmPay, saveTimeline, autoWarrantyEnd,
      onFileChange, formatCurrency, formatDate, statusLabel
    };
  },
  template: `
    <div class="page" v-if="!loading && project">
      <div class="page-header">
        <h2 class="page-title">{{ project.name }} <span class="muted">({{ project.code }})</span></h2>
        <a href="#/projects" class="btn btn-sm">← Quay lại</a>
      </div>

      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'info' }" @click="activeTab = 'info'">Thông tin</button>
        <button class="tab" :class="{ active: activeTab === 'modules' }" @click="activeTab = 'modules'">Module &amp; Công nghệ</button>
        <button class="tab" :class="{ active: activeTab === 'finance' }" @click="activeTab = 'finance'">Tài chính</button>
        <button class="tab" :class="{ active: activeTab === 'quotes' }" @click="activeTab = 'quotes'">Báo giá</button>
        <button class="tab" :class="{ active: activeTab === 'timeline' }" @click="activeTab = 'timeline'">Thời gian</button>
        <button class="tab" :class="{ active: activeTab === 'files' }" @click="activeTab = 'files'">File đính kèm</button>
      </div>

      <div v-show="activeTab === 'info'" class="detail-card">
        <div class="form-row">
          <div class="form-group"><label>Tên dự án</label><input class="input" v-model="info.name" /></div>
          <div class="form-group">
            <label>Khách hàng</label>
            <select class="input" v-model="info.customer_id">
              <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.company_name }}</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Người phụ trách</label>
            <select class="input" v-model="info.assignee_id">
              <option value="">-- Chưa phân công --</option>
              <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.full_name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Trạng thái</label>
            <select class="input" v-model="info.status">
              <option v-for="s in PROJECT_STATUS_OPTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Loại phần mềm</label><input class="input" v-model="info.software_type" /></div>
          <div class="form-group"><label>Ngành nghề</label><input class="input" v-model="info.industry" /></div>
        </div>
        <div class="form-group">
          <label>Nội dung dự án / Mô tả yêu cầu</label>
          <textarea class="input description-box" rows="8" v-model="info.description"></textarea>
        </div>
        <button v-if="can('projects','can_edit')" class="btn btn-primary" @click="saveInfo">Lưu thông tin</button>
      </div>

      <div v-show="activeTab === 'modules'" class="detail-card">
        <h4>Module sử dụng</h4>
        <div class="form-row" v-if="can('projects','can_edit')">
          <select class="input" v-model="addModuleId">
            <option value="">-- Chọn module để thêm --</option>
            <option v-for="m in catalog" :key="m.id" :value="m.id">{{ m.name }} ({{ formatCurrency(m.price) }})</option>
          </select>
          <button class="btn" @click="addModule">+ Thêm</button>
        </div>
        <table class="table">
          <thead><tr><th>Tên Module</th><th>Giá</th><th>Ghi chú</th><th v-if="can('projects','can_edit')"></th></tr></thead>
          <tbody>
            <tr v-for="m in projectModules" :key="m.id">
              <td>{{ m.name_snapshot }}</td><td>{{ formatCurrency(m.price) }}</td><td>{{ m.note }}</td>
              <td v-if="can('projects','can_edit')"><button class="btn btn-sm btn-danger" @click="removeModule(m.id)">Xóa</button></td>
            </tr>
          </tbody>
          <tfoot><tr><td><b>Tổng</b></td><td colspan="2"><b>{{ formatCurrency(modulesTotal) }}</b></td></tr></tfoot>
        </table>
        <button v-if="can('projects','can_edit')" class="btn btn-sm" @click="applyModulesTotal">Áp dụng tổng này vào Tổng tiền dự án</button>

        <h4 style="margin-top:24px">Công nghệ sử dụng</h4>
        <div class="tech-grid">
          <label v-for="t in technologies" :key="t.id" class="tech-chip" :class="{ active: selectedTechIds.includes(t.id) }">
            <input type="checkbox" :checked="selectedTechIds.includes(t.id)" @change="toggleTech(t.id)" :disabled="!can('projects','can_edit')" />
            {{ t.name }}
          </label>
        </div>
      </div>

      <div v-show="activeTab === 'finance'" class="detail-card">
        <div class="form-row">
          <div class="form-group"><label>Tổng tiền</label><CurrencyInput v-model="finance.total_amount" /></div>
          <div class="form-group"><label>Tiền cọc</label><CurrencyInput v-model="finance.deposit_amount" /></div>
        </div>
        <button v-if="can('projects','can_edit')" class="btn btn-primary" @click="saveFinance">Lưu tài chính</button>
        <div class="finance-summary">
          <div><b>Đã thanh toán:</b> {{ formatCurrency(financials.paid_amount) }}</div>
          <div><b>Công nợ:</b> {{ formatCurrency(financials.debt_amount) }}</div>
          <div><b>Chưa phân bổ đợt TT:</b> {{ formatCurrency(remainingToAllocate) }}</div>
        </div>

        <h4 style="margin-top:24px">Đợt thanh toán</h4>
        <div class="form-row" v-if="can('projects','can_edit')">
          <input class="input" placeholder="Tên đợt (VD: Cọc)" v-model="newInstallment.name" />
          <input class="input" type="number" placeholder="% " v-model.number="newInstallment.percent" @input="applyPercent" style="max-width:100px" />
          <CurrencyInput v-model="newInstallment.amount" placeholder="Số tiền" />
          <button class="btn" @click="submitInstallment">+ Thêm đợt</button>
        </div>
        <table class="table">
          <thead><tr><th>Tên đợt</th><th>%</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày TT</th><th></th></tr></thead>
          <tbody>
            <tr v-for="i in installments" :key="i.id">
              <td>{{ i.name }}</td><td>{{ i.percent ? i.percent + '%' : '—' }}</td><td>{{ formatCurrency(i.amount) }}</td>
              <td><span :class="i.status === 'da_thanh_toan' ? 'badge-green' : 'badge-gray'">{{ i.status === 'da_thanh_toan' ? 'Đã thanh toán' : 'Chưa thanh toán' }}</span></td>
              <td>{{ formatDate(i.paid_at) }}</td>
              <td>
                <button v-if="i.status === 'chua_thanh_toan'" class="btn btn-sm btn-primary" @click="openPay(i)">Thanh toán / QR</button>
                <button v-if="i.status === 'chua_thanh_toan' && can('projects','can_edit')" class="btn btn-sm btn-danger" @click="removeInstallment(i.id)">Xóa</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-show="activeTab === 'quotes'" class="detail-card">
        <div class="page-header">
          <h4>Lịch sử báo giá</h4>
          <a class="btn btn-primary btn-sm" :href="'#/quotes/new?project=' + project.id">+ Tạo báo giá</a>
        </div>
        <table class="table" v-if="quotes.length">
          <thead><tr><th>Mã báo giá</th><th>Phiên bản</th><th>Trạng thái</th><th>Tổng tiền</th><th>Đã áp dụng</th><th></th></tr></thead>
          <tbody>
            <tr v-for="q in quotes" :key="q.id">
              <td>{{ q.code }}</td><td>v{{ q.version_no }}</td><td>{{ q.status === 'nhap' ? 'Nháp' : 'Đã gửi' }}</td>
              <td>{{ formatCurrency(q.total) }}</td>
              <td>{{ q.applied_at ? formatDate(q.applied_at) : '—' }}</td>
              <td><a class="btn btn-sm" :href="'#/quotes/' + q.id">Xem</a></td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">Chưa có báo giá nào cho dự án này</p>
      </div>

      <div v-show="activeTab === 'timeline'" class="detail-card">
        <p><b>Ngày tạo:</b> {{ formatDate(project.created_at) }}</p>
        <div class="form-row">
          <div class="form-group"><label>Ngày bắt đầu</label><input class="input" type="date" v-model="timeline.start_date" /></div>
          <div class="form-group"><label>Hạn bàn giao</label><input class="input" type="date" v-model="timeline.deadline_date" /></div>
        </div>
        <p v-if="deadlineDaysLeft !== null" class="muted">Còn lại: {{ deadlineDaysLeft }} ngày ({{ deadlineDaysLeft < 0 ? 'đã quá hạn' : 'còn hạn' }})</p>
        <div class="form-row">
          <div class="form-group"><label>Ngày bàn giao</label><input class="input" type="date" v-model="timeline.delivery_date" /></div>
          <div class="form-group"><label>Thời gian bảo hành (tháng)</label><input class="input" type="number" v-model.number="timeline.warranty_months" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Ngày hết bảo hành</label><input class="input" type="date" v-model="timeline.warranty_end_date" /></div>
          <div class="form-group" style="align-self:flex-end"><button class="btn btn-sm" @click="autoWarrantyEnd">Tự tính từ ngày bàn giao</button></div>
        </div>
        <p v-if="warrantyDaysLeft !== null" class="muted">Bảo hành còn lại: {{ warrantyDaysLeft }} ngày</p>
        <button v-if="can('projects','can_edit')" class="btn btn-primary" @click="saveTimeline">Lưu thời gian</button>
      </div>

      <div v-show="activeTab === 'files'" class="detail-card">
        <input type="file" @change="onFileChange" :disabled="uploading" />
        <ul class="attachment-list">
          <li v-for="a in attachments" :key="a.id"><a :href="a.file_url" target="_blank">{{ a.file_name }}</a> <span class="muted small">{{ formatDate(a.created_at) }}</span></li>
        </ul>
        <p v-if="attachments.length === 0" class="muted">Chưa có file nào</p>
      </div>

      <Modal :modelValue="!!payingInstallment" @update:modelValue="v => { if (!v) payingInstallment = null }" title="Thanh toán đợt">
        <div v-if="payingInstallment" class="qr-pay-box">
          <p><b>{{ payingInstallment.name }}</b> — {{ formatCurrency(payingInstallment.amount) }}</p>
          <img v-if="qrUrl" :src="qrUrl" class="qr-image" />
          <p v-else class="muted">Chưa cấu hình tài khoản ngân hàng trong Cài đặt.</p>
        </div>
        <template #footer>
          <button class="btn" @click="payingInstallment = null">Đóng</button>
          <button v-if="can('projects','can_edit') || can('projects','can_approve_payment')" class="btn btn-primary" @click="askConfirmPay">Xác nhận đã thanh toán</button>
        </template>
      </Modal>
      <ConfirmDialog v-model="confirmPayOpen" message="Xác nhận đã nhận được thanh toán cho đợt này?" @confirm="doConfirmPay" />
    </div>
    <div v-else class="loading">Đang tải...</div>
  `
};
