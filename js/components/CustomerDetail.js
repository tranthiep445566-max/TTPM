const { ref, onMounted, computed } = Vue;
const { useRoute } = VueRouter;
import { getCustomer, getCustomerProjects, getCustomerQuotes, getCustomerAttachments, uploadAttachment } from '../api/customers.js';
import { fetchFinancialsMap } from '../api/projects.js';
import { formatCurrency, formatDate, statusLabel } from '../utils.js';
import { state, toast } from '../state.js';

export default {
  name: 'CustomerDetail',
  setup() {
    const route = useRoute();
    const customer = ref(null);
    const projects = ref([]);
    const quotes = ref([]);
    const attachments = ref([]);
    const loading = ref(true);
    const uploading = ref(false);

    const totals = computed(() => {
      const total = projects.value.reduce((s, p) => s + Number(p.total_amount || 0), 0);
      const paid = projects.value.reduce((s, p) => s + Number(p.financials?.paid_amount || 0), 0);
      return { total, paid, debt: total - paid };
    });

    async function load() {
      loading.value = true;
      try {
        const id = route.params.id;
        const [cust, projs, quotesData, atts] = await Promise.all([
          getCustomer(id), getCustomerProjects(id), getCustomerQuotes(id), getCustomerAttachments(id)
        ]);
        customer.value = cust;
        const finMap = await fetchFinancialsMap(projs.map(p => p.id));
        projs.forEach(p => { p.financials = finMap[p.id] || { paid_amount: 0, debt_amount: p.total_amount }; });
        projects.value = projs;
        quotes.value = quotesData;
        attachments.value = atts;
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        loading.value = false;
      }
    }

    async function onFileChange(e) {
      const file = e.target.files[0];
      if (!file) return;
      uploading.value = true;
      try {
        await uploadAttachment('customer', customer.value.id, file, state.profile.id);
        attachments.value = await getCustomerAttachments(customer.value.id);
        toast('Đã tải lên file');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        uploading.value = false;
        e.target.value = '';
      }
    }

    onMounted(load);

    return { customer, projects, quotes, attachments, totals, loading, uploading, onFileChange, formatCurrency, formatDate, statusLabel };
  },
  template: `
    <div class="page" v-if="!loading && customer">
      <div class="page-header">
        <h2 class="page-title">{{ customer.company_name }} <span class="muted">({{ customer.code }})</span></h2>
        <a href="#/customers" class="btn btn-sm">← Quay lại</a>
      </div>

      <div class="detail-grid">
        <div class="detail-card">
          <h4>Thông tin</h4>
          <p><b>Người liên hệ:</b> {{ customer.contact_person || '—' }}</p>
          <p><b>Điện thoại:</b> {{ customer.phone || '—' }}</p>
          <p><b>Email:</b> {{ customer.email || '—' }}</p>
          <p><b>Ngành nghề:</b> {{ customer.industry || '—' }}</p>
          <p><b>Ghi chú:</b> {{ customer.note || '—' }}</p>
        </div>
        <div class="detail-card">
          <h4>Tổng quan tài chính</h4>
          <p><b>Tổng giá trị:</b> {{ formatCurrency(totals.total) }}</p>
          <p><b>Đã thanh toán:</b> {{ formatCurrency(totals.paid) }}</p>
          <p><b>Công nợ:</b> {{ formatCurrency(totals.debt) }}</p>
        </div>
      </div>

      <div class="detail-card">
        <h4>Danh sách dự án</h4>
        <table class="table" v-if="projects.length">
          <thead><tr><th>Mã DA</th><th>Tên dự án</th><th>Trạng thái</th><th>Tổng tiền</th><th>Đã TT</th><th>Công nợ</th><th></th></tr></thead>
          <tbody>
            <tr v-for="p in projects" :key="p.id">
              <td>{{ p.code }}</td><td>{{ p.name }}</td><td>{{ statusLabel(p.status) }}</td>
              <td>{{ formatCurrency(p.total_amount) }}</td>
              <td>{{ formatCurrency(p.financials?.paid_amount) }}</td>
              <td>{{ formatCurrency(p.financials?.debt_amount) }}</td>
              <td><a class="btn btn-sm" :href="'#/projects/' + p.id">Xem</a></td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">Chưa có dự án nào</p>
      </div>

      <div class="detail-card">
        <h4>Báo giá đã gửi</h4>
        <table class="table" v-if="quotes.length">
          <thead><tr><th>Mã báo giá</th><th>Phiên bản</th><th>Trạng thái</th><th>Tổng tiền</th><th></th></tr></thead>
          <tbody>
            <tr v-for="q in quotes" :key="q.id">
              <td>{{ q.code }}</td><td>v{{ q.version_no }}</td><td>{{ q.status === 'nhap' ? 'Nháp' : 'Đã gửi' }}</td>
              <td>{{ formatCurrency(q.total) }}</td>
              <td><a class="btn btn-sm" :href="'#/quotes/' + q.id">Xem</a></td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">Chưa có báo giá nào</p>
      </div>

      <div class="detail-card">
        <h4>File đính kèm</h4>
        <input type="file" @change="onFileChange" :disabled="uploading" />
        <ul class="attachment-list">
          <li v-for="a in attachments" :key="a.id"><a :href="a.file_url" target="_blank">{{ a.file_name }}</a> <span class="muted small">{{ formatDate(a.created_at) }}</span></li>
        </ul>
        <p v-if="attachments.length === 0" class="muted">Chưa có file nào</p>
      </div>
    </div>
    <div v-else class="loading">Đang tải...</div>
  `
};
