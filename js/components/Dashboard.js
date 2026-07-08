const { ref, onMounted, nextTick } = Vue;
import { getClient } from '../supabaseClient.js';
import { toast } from '../state.js';
import { formatCurrency, formatDate, daysLeft, statusLabel, PROJECT_STATUS_OPTIONS } from '../utils.js';
import { listAuditLog } from '../api/auditLog.js';
import { fetchFinancialsMap } from '../api/projects.js';

const ACTIVE_STATUSES = ['dang_phan_tich','dang_thiet_ke','dang_lap_trinh','dang_kiem_thu','cho_ban_giao'];
const OVERDUE_EXCLUDE = ['da_ban_giao','hoan_thanh','huy','dang_bao_hanh'];

export default {
  name: 'Dashboard',
  setup() {
    const loading = ref(true);
    const cards = ref({});
    const upcomingDeadlines = ref([]);
    const upcomingWarranty = ref([]);
    const recentActivity = ref([]);
    const recentNotifications = ref([]);
    const charts = {};

    function renderChart(canvasId, config) {
      const el = document.getElementById(canvasId);
      if (!el) return;
      if (charts[canvasId]) charts[canvasId].destroy();
      charts[canvasId] = new Chart(el, config);
    }

    async function load() {
      loading.value = true;
      try {
      const sb = getClient();
      const { data: projects, error: projErr } = await sb.from('projects').select('*');
      if (projErr) throw projErr;
      const [finMap, customersCountRes, employeesCountRes, projectModulesRes, paidInstallmentsRes, notifsRes, auditRows] = await Promise.all([
        fetchFinancialsMap(projects.map(p => p.id)),
        sb.from('customers').select('id', { count: 'exact', head: false }),
        sb.from('profiles').select('id').eq('active', true),
        sb.from('project_modules').select('name_snapshot, price'),
        sb.from('payment_installments').select('amount, paid_at').eq('status', 'da_thanh_toan'),
        sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(5),
        listAuditLog(6)
      ]);
      projects.forEach(p => { p.financials = finMap[p.id] || { paid_amount: 0, debt_amount: p.total_amount }; });
      const customersCount = customersCountRes.data;
      const employeesCount = employeesCountRes.data;
      const projectModules = projectModulesRes.data;
      const paidInstallments = paidInstallmentsRes.data;
      const notifs = notifsRes.data;

      const today = new Date(); today.setHours(0,0,0,0);
      const totalRevenue = projects.filter(p => p.status !== 'huy').reduce((s, p) => s + Number(p.total_amount || 0), 0);
      const paidTotal = projects.reduce((s, p) => s + Number(p.financials.paid_amount || 0), 0);
      const debtTotal = totalRevenue - paidTotal;
      const depositTotal = projects.reduce((s, p) => s + Number(p.deposit_amount || 0), 0);

      cards.value = {
        total: projects.length,
        active: projects.filter(p => ACTIVE_STATUSES.includes(p.status)).length,
        waitingDeposit: projects.filter(p => p.status === 'cho_coc').length,
        waitingPayment: projects.filter(p => Number(p.financials.debt_amount) > 0 && !['cho_bao_gia','da_gui_bao_gia','cho_coc','huy'].includes(p.status)).length,
        overdue: projects.filter(p => p.deadline_date && new Date(p.deadline_date) < today && !OVERDUE_EXCLUDE.includes(p.status)).length,
        warranty: projects.filter(p => p.status === 'dang_bao_hanh').length,
        done: projects.filter(p => p.status === 'hoan_thanh').length,
        totalRevenue, paidTotal, debtTotal, depositTotal,
        customers: customersCount ? customersCount.length : 0,
        employees: employeesCount ? employeesCount.length : 0
      };

      upcomingDeadlines.value = projects
        .filter(p => p.deadline_date && !['hoan_thanh','huy','da_ban_giao'].includes(p.status))
        .map(p => ({ ...p, left: daysLeft(p.deadline_date) }))
        .filter(p => p.left !== null && p.left <= 7)
        .sort((a, b) => a.left - b.left)
        .slice(0, 8);

      upcomingWarranty.value = projects
        .filter(p => p.status === 'dang_bao_hanh' && p.warranty_end_date)
        .map(p => ({ ...p, left: daysLeft(p.warranty_end_date) }))
        .filter(p => p.left !== null && p.left <= 30)
        .sort((a, b) => a.left - b.left)
        .slice(0, 8);

      recentActivity.value = auditRows;
      recentNotifications.value = notifs || [];

      loading.value = false;
      await nextTick();
      drawCharts(projects, projectModules || [], paidInstallments || []);
      } catch (e) {
        toast(e.message, 'error');
        loading.value = false;
      }
    }

    function drawCharts(projects, projectModules, paidInstallments) {
      const statusCounts = PROJECT_STATUS_OPTIONS.map(s => projects.filter(p => p.status === s.value).length);
      renderChart('chartStatus', {
        type: 'doughnut',
        data: { labels: PROJECT_STATUS_OPTIONS.map(s => s.label), datasets: [{ data: statusCounts, backgroundColor: PROJECT_STATUS_OPTIONS.map(s => s.color) }] },
        options: { plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } } } }
      });

      const now = new Date();
      const months = Array.from({ length: 12 }, (_, i) => i);
      const monthRevenue = months.map(m => paidInstallments
        .filter(pi => pi.paid_at && new Date(pi.paid_at).getFullYear() === now.getFullYear() && new Date(pi.paid_at).getMonth() === m)
        .reduce((s, pi) => s + Number(pi.amount || 0), 0));
      renderChart('chartMonthly', {
        type: 'bar',
        data: { labels: months.map(m => 'Th' + (m + 1)), datasets: [{ label: 'Doanh thu', data: monthRevenue, backgroundColor: '#2563eb' }] },
        options: { plugins: { legend: { display: false } } }
      });

      const years = [...new Set(paidInstallments.filter(pi => pi.paid_at).map(pi => new Date(pi.paid_at).getFullYear()))].sort();
      const yearRevenue = years.map(y => paidInstallments.filter(pi => new Date(pi.paid_at).getFullYear() === y).reduce((s, pi) => s + Number(pi.amount || 0), 0));
      renderChart('chartYearly', {
        type: 'bar',
        data: { labels: years, datasets: [{ label: 'Doanh thu', data: yearRevenue, backgroundColor: '#16a34a' }] },
        options: { plugins: { legend: { display: false } } }
      });

      const moduleAgg = {};
      projectModules.forEach(pm => { moduleAgg[pm.name_snapshot] = (moduleAgg[pm.name_snapshot] || 0) + 1; });
      const topModules = Object.entries(moduleAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);
      renderChart('chartTopModules', {
        type: 'bar',
        data: { labels: topModules.map(m => m[0]), datasets: [{ label: 'Số lần bán', data: topModules.map(m => m[1]), backgroundColor: '#f59e0b' }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false } } }
      });

      const empAgg = {};
      projects.forEach(p => { if (p.assignee_id) empAgg[p.assignee_id] = (empAgg[p.assignee_id] || 0) + Number(p.total_amount || 0); });
      loadNamesAndRenderTop('chartTopEmployees', empAgg, 'profiles', 'full_name');

      const custAgg = {};
      projects.forEach(p => { if (p.customer_id) custAgg[p.customer_id] = (custAgg[p.customer_id] || 0) + Number(p.total_amount || 0); });
      loadNamesAndRenderTop('chartTopCustomers', custAgg, 'customers', 'company_name');
    }

    async function loadNamesAndRenderTop(canvasId, agg, table, nameField) {
      const ids = Object.keys(agg);
      if (!ids.length) return;
      const sb = getClient();
      const { data } = await sb.from(table).select('id, ' + nameField).in('id', ids);
      const nameMap = {}; (data || []).forEach(r => { nameMap[r.id] = r[nameField]; });
      const top = Object.entries(agg).sort((a, b) => b[1] - a[1]).slice(0, 5);
      renderChart(canvasId, {
        type: 'bar',
        data: { labels: top.map(t => nameMap[t[0]] || '—'), datasets: [{ label: 'Doanh thu', data: top.map(t => t[1]), backgroundColor: '#8b5cf6' }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false } } }
      });
    }

    onMounted(load);

    return { loading, cards, upcomingDeadlines, upcomingWarranty, recentActivity, recentNotifications, formatCurrency, formatDate, statusLabel };
  },
  template: `
    <div class="dashboard">
      <h2 class="page-title">Dashboard</h2>
      <div v-if="loading" class="loading">Đang tải...</div>
      <template v-else>
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-value">{{ cards.total }}</div><div class="stat-label">Tổng dự án</div></div>
          <div class="stat-card"><div class="stat-value">{{ cards.active }}</div><div class="stat-label">Đang triển khai</div></div>
          <div class="stat-card"><div class="stat-value">{{ cards.waitingDeposit }}</div><div class="stat-label">Chờ cọc</div></div>
          <div class="stat-card"><div class="stat-value">{{ cards.waitingPayment }}</div><div class="stat-label">Chờ thanh toán</div></div>
          <div class="stat-card warn"><div class="stat-value">{{ cards.overdue }}</div><div class="stat-label">Quá hạn</div></div>
          <div class="stat-card"><div class="stat-value">{{ cards.warranty }}</div><div class="stat-label">Bảo hành</div></div>
          <div class="stat-card good"><div class="stat-value">{{ cards.done }}</div><div class="stat-label">Hoàn thành</div></div>
          <div class="stat-card"><div class="stat-value">{{ cards.customers }}</div><div class="stat-label">Khách hàng</div></div>
          <div class="stat-card"><div class="stat-value">{{ cards.employees }}</div><div class="stat-label">Nhân viên</div></div>
          <div class="stat-card money"><div class="stat-value">{{ formatCurrency(cards.totalRevenue) }}</div><div class="stat-label">Tổng doanh thu</div></div>
          <div class="stat-card money good"><div class="stat-value">{{ formatCurrency(cards.paidTotal) }}</div><div class="stat-label">Đã thanh toán</div></div>
          <div class="stat-card money warn"><div class="stat-value">{{ formatCurrency(cards.debtTotal) }}</div><div class="stat-label">Công nợ còn lại</div></div>
          <div class="stat-card money"><div class="stat-value">{{ formatCurrency(cards.depositTotal) }}</div><div class="stat-label">Tổng tiền cọc</div></div>
        </div>

        <div class="chart-grid">
          <div class="chart-card"><h4>Doanh thu theo tháng ({{ new Date().getFullYear() }})</h4><canvas id="chartMonthly"></canvas></div>
          <div class="chart-card"><h4>Doanh thu theo năm</h4><canvas id="chartYearly"></canvas></div>
          <div class="chart-card"><h4>Dự án theo trạng thái</h4><canvas id="chartStatus"></canvas></div>
          <div class="chart-card"><h4>Top Module bán nhiều</h4><canvas id="chartTopModules"></canvas></div>
          <div class="chart-card"><h4>Top nhân viên doanh số</h4><canvas id="chartTopEmployees"></canvas></div>
          <div class="chart-card"><h4>Top khách hàng</h4><canvas id="chartTopCustomers"></canvas></div>
        </div>

        <div class="list-grid">
          <div class="list-card">
            <h4>Thông báo mới</h4>
            <div v-if="recentNotifications.length === 0" class="muted">Không có thông báo</div>
            <div v-for="n in recentNotifications" :key="n.id" class="list-item">
              <strong>{{ n.title }}</strong><span class="muted small">{{ formatDate(n.created_at) }}</span>
            </div>
          </div>
          <div class="list-card">
            <h4>Hoạt động gần đây</h4>
            <div v-if="recentActivity.length === 0" class="muted">Chưa có hoạt động</div>
            <div v-for="a in recentActivity" :key="a.id" class="list-item">
              <strong>{{ a.action }}</strong> — {{ a.description }}
              <span class="muted small">{{ formatDate(a.created_at) }}</span>
            </div>
          </div>
          <div class="list-card">
            <h4>Dự án sắp đến hạn</h4>
            <div v-if="upcomingDeadlines.length === 0" class="muted">Không có dự án sắp đến hạn</div>
            <a v-for="p in upcomingDeadlines" :key="p.id" class="list-item" :href="'#/projects/' + p.id">
              <strong>{{ p.name }}</strong> — còn {{ p.left }} ngày
            </a>
          </div>
          <div class="list-card">
            <h4>Dự án sắp hết bảo hành</h4>
            <div v-if="upcomingWarranty.length === 0" class="muted">Không có dự án sắp hết bảo hành</div>
            <a v-for="p in upcomingWarranty" :key="p.id" class="list-item" :href="'#/projects/' + p.id">
              <strong>{{ p.name }}</strong> — còn {{ p.left }} ngày
            </a>
          </div>
        </div>
      </template>
    </div>
  `
};
