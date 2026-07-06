const { ref, reactive, computed, onMounted } = Vue;
import { listCommissions, createCommission, deleteCommission, listCommissionPayments, createCommissionPayment, approveCommissionPayment, listAllCommissionPayments } from '../api/commissions.js';
import { listProjects } from '../api/projects.js';
import { listEmployees } from '../api/employees.js';
import { can, toast, state } from '../state.js';
import { formatCurrency, formatDate, formatDateTime, buildVietQrUrlForAccount } from '../utils.js';
import Modal from './common/Modal.js';
import ConfirmDialog from './common/ConfirmDialog.js';
import CurrencyInput from './common/CurrencyInput.js';

function emptyForm() { return { project_id: '', employee_id: '', commission_percent: 10 }; }

export default {
  name: 'Commissions',
  components: { Modal, ConfirmDialog, CurrencyInput },
  setup() {
    const commissions = ref([]);
    const projects = ref([]);
    const employees = ref([]);
    const allPayments = ref([]);
    const loading = ref(true);
    const addOpen = ref(false);
    const form = reactive(emptyForm());
    const payModalOpen = ref(false);
    const activeCommission = ref(null);
    const commissionPayments = ref([]);
    const payAmount = ref(0);
    const confirmOpen = ref(false);
    const toDelete = ref(null);
    const periodFilter = ref('all');

    function computeRow(c) {
      const total = Number(c.projects.total_amount || 0);
      const paidBasis = Number(c.projects.financials?.paid_amount || 0);
      const percent = Number(c.commission_percent || 0);
      const expectedTotal = total * percent / 100;
      const availableTotal = paidBasis * percent / 100;
      return { expectedTotal, availableTotal, remainingExpected: expectedTotal - availableTotal };
    }

    async function load() {
      loading.value = true;
      [commissions.value, projects.value, employees.value, allPayments.value] = await Promise.all([
        listCommissions(), listProjects(), listEmployees(), listAllCommissionPayments()
      ]);
      loading.value = false;
    }

    const summary = computed(() => {
      let expected = 0, available = 0, paid = 0;
      commissions.value.forEach(c => {
        const r = computeRow(c);
        expected += r.remainingExpected;
        available += r.availableTotal;
      });
      paid = allPayments.value.filter(p => p.status === 'da_thanh_toan').reduce((s, p) => s + Number(p.amount || 0), 0);
      return { expected, available, paid };
    });

    const filteredPayments = computed(() => {
      if (periodFilter.value === 'all') return allPayments.value;
      const now = new Date();
      return allPayments.value.filter(p => {
        if (!p.payment_date) return false;
        const d = new Date(p.payment_date);
        if (periodFilter.value === 'day') return d.toDateString() === now.toDateString();
        if (periodFilter.value === 'week') { const diff = (now - d) / 86400000; return diff >= 0 && diff < 7; }
        if (periodFilter.value === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        if (periodFilter.value === 'quarter') return Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3) && d.getFullYear() === now.getFullYear();
        if (periodFilter.value === 'year') return d.getFullYear() === now.getFullYear();
        return true;
      });
    });

    function openAdd() { Object.assign(form, emptyForm()); addOpen.value = true; }
    function onEmployeeChange() {
      const emp = employees.value.find(e => e.id === form.employee_id);
      if (emp && emp.default_commission_percent) form.commission_percent = Number(emp.default_commission_percent);
    }
    async function submitAdd() {
      if (!form.project_id || !form.employee_id) { toast('Chọn dự án và nhân viên', 'error'); return; }
      try {
        await createCommission(form);
        toast('Đã thêm hoa hồng');
        addOpen.value = false;
        await load();
      } catch (e) { toast(e.message, 'error'); }
    }

    function askDelete(row) { toDelete.value = row; confirmOpen.value = true; }
    async function doDelete() { await deleteCommission(toDelete.value.id); toast('Đã xóa'); await load(); }

    async function openPay(c) {
      activeCommission.value = c;
      const r = computeRow(c);
      commissionPayments.value = await listCommissionPayments(c.id);
      const alreadyPaid = commissionPayments.value.filter(p => p.status === 'da_thanh_toan').reduce((s, p) => s + Number(p.amount), 0);
      payAmount.value = Math.max(0, Math.round(r.availableTotal - alreadyPaid));
      payModalOpen.value = true;
    }

    async function submitPayRequest() {
      if (!payAmount.value || payAmount.value <= 0) { toast('Nhập số tiền hợp lệ', 'error'); return; }
      try {
        await createCommissionPayment({ commission_id: activeCommission.value.id, amount: payAmount.value, status: 'cho_duyet' });
        toast('Đã tạo đề nghị thanh toán');
        commissionPayments.value = await listCommissionPayments(activeCommission.value.id);
        allPayments.value = await listAllCommissionPayments();
      } catch (e) { toast(e.message, 'error'); }
    }

    async function approve(payment) {
      try {
        await approveCommissionPayment(payment.id, state.profile.id);
        toast('Đã duyệt thanh toán hoa hồng');
        commissionPayments.value = await listCommissionPayments(activeCommission.value.id);
        allPayments.value = await listAllCommissionPayments();
      } catch (e) { toast(e.message, 'error'); }
    }

    const payQrUrl = computed(() => {
      if (!activeCommission.value) return '';
      const p = activeCommission.value.profiles;
      return buildVietQrUrlForAccount(p.bank_bin, p.bank_account_number, p.bank_account_holder, payAmount.value, 'Hoa hong ' + activeCommission.value.projects.code);
    });

    onMounted(load);

    return {
      commissions, projects, employees, loading, addOpen, form, payModalOpen, activeCommission, commissionPayments,
      payAmount, confirmOpen, periodFilter, summary, filteredPayments, computeRow, can,
      openAdd, onEmployeeChange, submitAdd, askDelete, doDelete, openPay, submitPayRequest, approve, payQrUrl,
      formatCurrency, formatDate, formatDateTime
    };
  },
  template: `
    <div class="page">
      <div class="page-header"><h2 class="page-title">Hoa hồng</h2></div>

      <div class="stat-grid">
        <div class="stat-card money"><div class="stat-value">{{ formatCurrency(summary.expected) }}</div><div class="stat-label">Hoa hồng dự kiến (còn lại)</div></div>
        <div class="stat-card money good"><div class="stat-value">{{ formatCurrency(summary.available) }}</div><div class="stat-label">Hoa hồng có thể nhận</div></div>
        <div class="stat-card money"><div class="stat-value">{{ formatCurrency(summary.paid) }}</div><div class="stat-label">Đã thanh toán</div></div>
      </div>

      <div v-if="loading" class="loading">Đang tải...</div>
      <template v-else>
        <div class="detail-card">
          <div class="page-header"><h4>Danh sách hoa hồng theo dự án</h4>
            <button v-if="can('commissions','can_add')" class="btn btn-primary btn-sm" @click="openAdd">+ Gán hoa hồng</button>
          </div>
          <table class="table">
            <thead><tr><th>Dự án</th><th>Nhân viên</th><th>%</th><th>Dự kiến</th><th>Có thể nhận</th><th>Còn dự kiến</th><th></th></tr></thead>
            <tbody>
              <tr v-for="c in commissions" :key="c.id">
                <td>{{ c.projects.name }} ({{ c.projects.code }})</td>
                <td>{{ c.profiles.full_name }}</td>
                <td>{{ c.commission_percent }}%</td>
                <td>{{ formatCurrency(computeRow(c).expectedTotal) }}</td>
                <td>{{ formatCurrency(computeRow(c).availableTotal) }}</td>
                <td>{{ formatCurrency(computeRow(c).remainingExpected) }}</td>
                <td>
                  <button class="btn btn-sm btn-primary" @click="openPay(c)">Thanh toán</button>
                  <button v-if="can('commissions','can_delete')" class="btn btn-sm btn-danger" @click="askDelete(c)">Xóa</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="detail-card">
          <div class="page-header">
            <h4>Hoa hồng đã thanh toán</h4>
            <div class="status-tabs">
              <button class="status-tab" :class="{active: periodFilter==='all'}" @click="periodFilter='all'">Tất cả</button>
              <button class="status-tab" :class="{active: periodFilter==='day'}" @click="periodFilter='day'">Ngày</button>
              <button class="status-tab" :class="{active: periodFilter==='week'}" @click="periodFilter='week'">Tuần</button>
              <button class="status-tab" :class="{active: periodFilter==='month'}" @click="periodFilter='month'">Tháng</button>
              <button class="status-tab" :class="{active: periodFilter==='quarter'}" @click="periodFilter='quarter'">Quý</button>
              <button class="status-tab" :class="{active: periodFilter==='year'}" @click="periodFilter='year'">Năm</button>
            </div>
          </div>
          <table class="table">
            <thead><tr><th>Nhân viên</th><th>Dự án</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày thanh toán</th><th>Người duyệt</th></tr></thead>
            <tbody>
              <tr v-for="p in filteredPayments" :key="p.id">
                <td>{{ p.commissions?.profiles?.full_name }}</td>
                <td>{{ p.commissions?.projects?.code }}</td>
                <td>{{ formatCurrency(p.amount) }}</td>
                <td>{{ p.status === 'da_thanh_toan' ? 'Đã thanh toán' : 'Chờ duyệt' }}</td>
                <td>{{ formatDateTime(p.payment_date) }}</td>
                <td>{{ p.approved_by || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <Modal v-model="addOpen" title="Gán hoa hồng cho nhân viên">
        <div class="form-group">
          <label>Dự án</label>
          <select class="input" v-model="form.project_id">
            <option value="">-- Chọn dự án --</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }} ({{ p.code }})</option>
          </select>
        </div>
        <div class="form-group">
          <label>Nhân viên</label>
          <select class="input" v-model="form.employee_id" @change="onEmployeeChange">
            <option value="">-- Chọn nhân viên --</option>
            <option v-for="e in employees" :key="e.id" :value="e.id">{{ e.full_name }} ({{ e.default_commission_percent || 0 }}%)</option>
          </select>
        </div>
        <div class="form-group"><label>Hoa hồng (%)</label><input class="input" type="number" v-model.number="form.commission_percent" /></div>
        <template #footer>
          <button class="btn" @click="addOpen = false">Hủy</button>
          <button class="btn btn-primary" @click="submitAdd">Lưu</button>
        </template>
      </Modal>

      <Modal v-model="payModalOpen" title="Thanh toán hoa hồng" v-if="activeCommission">
        <p><b>{{ activeCommission.profiles.full_name }}</b> — Dự án {{ activeCommission.projects.code }}</p>
        <div class="form-group"><label>Số tiền thanh toán</label><CurrencyInput v-model="payAmount" /></div>
        <button v-if="can('commissions','can_edit')" class="btn btn-sm" @click="submitPayRequest">Tạo đề nghị thanh toán</button>
        <img v-if="payQrUrl" :src="payQrUrl" class="qr-image" />
        <p v-else class="muted small">Nhân viên chưa cập nhật tài khoản ngân hàng.</p>
        <h4>Lịch sử</h4>
        <table class="table">
          <thead><tr><th>Số tiền</th><th>Trạng thái</th><th>Ngày</th><th></th></tr></thead>
          <tbody>
            <tr v-for="p in commissionPayments" :key="p.id">
              <td>{{ formatCurrency(p.amount) }}</td>
              <td>{{ p.status === 'da_thanh_toan' ? 'Đã thanh toán' : 'Chờ duyệt' }}</td>
              <td>{{ formatDateTime(p.payment_date) }}</td>
              <td><button v-if="p.status === 'cho_duyet' && can('commissions','can_approve_commission')" class="btn btn-sm btn-primary" @click="approve(p)">Duyệt &amp; Thanh toán</button></td>
            </tr>
          </tbody>
        </table>
        <template #footer><button class="btn" @click="payModalOpen = false">Đóng</button></template>
      </Modal>

      <ConfirmDialog v-model="confirmOpen" message="Xóa gán hoa hồng này?" @confirm="doDelete" />
    </div>
  `
};
