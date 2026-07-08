const { ref, reactive, onMounted } = Vue;
import { getClient } from '../supabaseClient.js';
import { toast } from '../state.js';
import { fetchFinancialsMap } from '../api/projects.js';
import { formatCurrency } from '../utils.js';

function defaultRange() {
  const to = new Date();
  const from = new Date(); from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default {
  name: 'Statistics',
  setup() {
    const range = reactive(defaultRange());
    const loading = ref(true);
    const result = ref(null);

    async function load() {
      loading.value = true;
      try {
      const sb = getClient();
      const fromDt = range.from;
      const toDt = range.to + 'T23:59:59';

      const { data: projects, error: projErr } = await sb.from('projects').select('*').gte('created_at', fromDt).lte('created_at', toDt);
      if (projErr) throw projErr;
      const projectIds = projects.map(p => p.id).length ? projects.map(p => p.id) : ['00000000-0000-0000-0000-000000000000'];

      const [finMap, customersNewRes, paidInstallmentsRes, commissionPaymentsRes, projectModulesRes] = await Promise.all([
        fetchFinancialsMap(projects.map(p => p.id)),
        sb.from('customers').select('id').gte('created_at', fromDt).lte('created_at', toDt),
        sb.from('payment_installments').select('amount, project_id').eq('status', 'da_thanh_toan').gte('paid_at', fromDt).lte('paid_at', toDt),
        sb.from('commission_payments').select('amount').eq('status', 'da_thanh_toan').gte('payment_date', fromDt).lte('payment_date', toDt),
        sb.from('project_modules').select('name_snapshot, project_id').in('project_id', projectIds)
      ]);
      projects.forEach(p => { p.financials = finMap[p.id] || { paid_amount: 0, debt_amount: p.total_amount }; });
      const customersNew = customersNewRes.data;
      const paidInstallments = paidInstallmentsRes.data;
      const commissionPayments = commissionPaymentsRes.data;
      const projectModules = projectModulesRes.data;

      const revenue = projects.reduce((s, p) => s + Number(p.total_amount || 0), 0);
      const debt = projects.reduce((s, p) => s + Number(p.financials.debt_amount || 0), 0);
      const deposit = projects.reduce((s, p) => s + Number(p.deposit_amount || 0), 0);
      const paidRevenue = (paidInstallments || []).reduce((s, i) => s + Number(i.amount || 0), 0);
      const commissionPaid = (commissionPayments || []).reduce((s, c) => s + Number(c.amount || 0), 0);
      const profit = paidRevenue - commissionPaid;

      const moduleAgg = {};
      (projectModules || []).forEach(pm => { moduleAgg[pm.name_snapshot] = (moduleAgg[pm.name_snapshot] || 0) + 1; });
      const topModules = Object.entries(moduleAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);

      const empAgg = {};
      projects.forEach(p => { if (p.assignee_id) empAgg[p.assignee_id] = (empAgg[p.assignee_id] || 0) + Number(p.total_amount || 0); });
      const empIds = Object.keys(empAgg);
      let topEmployees = [];
      if (empIds.length) {
        const { data: profs } = await sb.from('profiles').select('id, full_name').in('id', empIds);
        const nameMap = {}; (profs || []).forEach(p => { nameMap[p.id] = p.full_name; });
        topEmployees = Object.entries(empAgg).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, v]) => ({ name: nameMap[id] || '—', value: v }));
      }

      result.value = {
        revenue, debt, deposit, profit, commissionPaid,
        projectCount: projects.length, customerNewCount: (customersNew || []).length,
        topModules, topEmployees
      };
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);
    return { range, loading, result, load, formatCurrency };
  },
  template: `
    <div class="page">
      <div class="page-header"><h2 class="page-title">Thống kê</h2></div>
      <div class="detail-card">
        <div class="form-row">
          <div class="form-group"><label>Từ ngày</label><input class="input" type="date" v-model="range.from" /></div>
          <div class="form-group"><label>Đến ngày</label><input class="input" type="date" v-model="range.to" /></div>
          <div class="form-group" style="align-self:flex-end"><button class="btn btn-primary" @click="load">Xem thống kê</button></div>
        </div>
      </div>
      <div v-if="loading" class="loading">Đang tải...</div>
      <template v-else-if="result">
        <div class="stat-grid">
          <div class="stat-card money"><div class="stat-value">{{ formatCurrency(result.revenue) }}</div><div class="stat-label">Doanh thu</div></div>
          <div class="stat-card money warn"><div class="stat-value">{{ formatCurrency(result.debt) }}</div><div class="stat-label">Công nợ</div></div>
          <div class="stat-card money"><div class="stat-value">{{ formatCurrency(result.deposit) }}</div><div class="stat-label">Tiền cọc</div></div>
          <div class="stat-card money good"><div class="stat-value">{{ formatCurrency(result.profit) }}</div><div class="stat-label">Lợi nhuận (ước tính)</div></div>
          <div class="stat-card money"><div class="stat-value">{{ formatCurrency(result.commissionPaid) }}</div><div class="stat-label">Hoa hồng đã chi</div></div>
          <div class="stat-card"><div class="stat-value">{{ result.projectCount }}</div><div class="stat-label">Dự án</div></div>
          <div class="stat-card"><div class="stat-value">{{ result.customerNewCount }}</div><div class="stat-label">Khách hàng mới</div></div>
        </div>
        <div class="detail-grid">
          <div class="detail-card">
            <h4>Module bán nhiều</h4>
            <ol><li v-for="m in result.topModules" :key="m[0]">{{ m[0] }} — {{ m[1] }} lần</li></ol>
            <p v-if="result.topModules.length === 0" class="muted">Không có dữ liệu</p>
          </div>
          <div class="detail-card">
            <h4>Nhân viên doanh số cao</h4>
            <ol><li v-for="e in result.topEmployees" :key="e.name">{{ e.name }} — {{ formatCurrency(e.value) }}</li></ol>
            <p v-if="result.topEmployees.length === 0" class="muted">Không có dữ liệu</p>
          </div>
        </div>
      </template>
    </div>
  `
};
