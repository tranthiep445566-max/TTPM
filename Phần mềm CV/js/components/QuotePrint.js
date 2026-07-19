const { ref, reactive, computed, onMounted } = Vue;
const { useRoute } = VueRouter;
import { getProject, updateProject, listProjectModules, listProjectTechnologies } from '../api/projects.js';
import { listModules } from '../api/modulesCatalog.js';
import { getSettings } from '../api/settings.js';
import { can, toast } from '../state.js';
import { formatCurrency, formatDate, difficultyLabel, difficultyBadgeClass } from '../utils.js';

function todayIso() { return new Date().toISOString().slice(0, 10); }

export default {
  name: 'QuotePrint',
  setup() {
    const route = useRoute();
    const projectId = route.params.id;
    const loading = ref(true);
    const project = ref(null);
    const projectModules = ref([]);
    const catalog = ref([]);
    const techRows = ref([]);
    const settings = ref(null);

    const header = reactive({ quote_number: '', quote_date: '' });

    async function load() {
      loading.value = true;
      try {
        const [proj, pMods, cat, techs, s] = await Promise.all([
          getProject(projectId), listProjectModules(projectId), listModules(),
          listProjectTechnologies(projectId), getSettings()
        ]);
        project.value = proj;
        projectModules.value = pMods;
        catalog.value = cat;
        techRows.value = techs;
        settings.value = s;
        header.quote_number = proj.quote_number || ('BG-' + proj.code);
        header.quote_date = proj.quote_date || todayIso();
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        loading.value = false;
      }
    }

    function catalogFor(moduleId) {
      return catalog.value.find(m => m.id === moduleId) || null;
    }

    const total = computed(() => projectModules.value.reduce((s, m) => s + Number(m.price || 0), 0));
    const warrantyMonths = computed(() => project.value?.warranty_months || settings.value?.default_warranty_months || 0);

    async function saveHeader() {
      try {
        await updateProject(projectId, { quote_number: header.quote_number, quote_date: header.quote_date });
        toast('Đã lưu số báo giá');
        await load();
      } catch (e) { toast(e.message, 'error'); }
    }

    function doPrint() { window.print(); }

    onMounted(load);

    return {
      loading, project, projectModules, techRows, settings, header, total, warrantyMonths, can,
      catalogFor, saveHeader, doPrint, formatCurrency, formatDate, difficultyLabel, difficultyBadgeClass
    };
  },
  template: `
    <div class="page" v-if="!loading && project">
      <div class="page-header no-print">
        <h2 class="page-title">Xuất báo giá — {{ project.name }}</h2>
        <a :href="'#/projects/' + project.id" class="btn btn-sm">← Quay lại dự án</a>
      </div>

      <div class="export-toolbar no-print">
        <div class="form-group">
          <label>Số báo giá</label>
          <input class="input" v-model="header.quote_number" />
        </div>
        <div class="form-group">
          <label>Ngày lập</label>
          <input class="input" type="date" v-model="header.quote_date" />
        </div>
        <div class="export-toolbar-spacer"></div>
        <button v-if="can('projects','can_edit')" class="btn" @click="saveHeader">Lưu số / ngày</button>
        <button class="btn btn-primary" @click="doPrint">🖨️ In / Lưu PDF</button>
      </div>

      <div class="quote-doc" id="quote-print-area">
        <header class="qd-header">
          <div class="qd-top">
            <div>Mã báo giá<br /><span class="num">{{ header.quote_number }}</span></div>
            <div style="text-align:right">Ngày lập<br /><span class="num">{{ formatDate(header.quote_date) }}</span></div>
          </div>
          <h1 class="qd-title">{{ project.name }}</h1>
          <p class="qd-subtitle" v-if="project.description">{{ project.description }}</p>
          <p class="qd-to">
            <b>Kính gửi:</b> {{ project.customers?.company_name }}
            <template v-if="project.customers?.contact_person"> — {{ project.customers.contact_person }}</template>
            <template v-if="project.customers?.phone"> — {{ project.customers.phone }}</template>
          </p>
        </header>

        <div class="qd-hero">
          <span class="eyebrow">Tổng chi phí trọn gói</span>
          <div class="qd-stamp">
            <div>
              <div class="qd-price">{{ formatCurrency(total) }}<small>{{ settings?.currency || 'VNĐ' }}</small></div>
              <div class="qd-curly">Đã bao gồm {{ projectModules.length }} module</div>
            </div>
          </div>
          <p class="qd-note">Giá cố định cho toàn bộ phạm vi bên dưới — không phát sinh chi phí duy trì trong {{ warrantyMonths }} tháng bảo hành.</p>
        </div>

        <section class="qd-section" v-if="projectModules.length">
          <div class="qd-section-head">
            <span class="eyebrow">Chi tiết module</span>
            <h4>Phạm vi công việc</h4>
            <p>Danh sách các module chức năng nằm trong gói báo giá này.</p>
          </div>
          <div class="qd-flow">
            <div class="qd-node" v-for="(m, idx) in projectModules" :key="m.id">
              <div class="qd-idx">{{ String(idx + 1).padStart(2, '0') }}</div>
              <div class="qd-card">
                <div class="qd-card-head">
                  <span class="qd-mod-name">{{ m.name_snapshot }}</span>
                  <span class="qd-spacer"></span>
                  <span class="qd-badge" :class="difficultyBadgeClass(catalogFor(m.module_id)?.difficulty)" v-if="catalogFor(m.module_id)">
                    {{ difficultyLabel(catalogFor(m.module_id).difficulty) }}
                  </span>
                </div>
                <ul v-if="catalogFor(m.module_id) && catalogFor(m.module_id).module_features && catalogFor(m.module_id).module_features.length">
                  <li v-for="f in catalogFor(m.module_id).module_features" :key="f.id">{{ f.name }}</li>
                </ul>
                <ul v-else-if="m.note"><li>{{ m.note }}</li></ul>
                <div class="qd-price-row"><span class="label">Giá module</span><span class="val">{{ formatCurrency(m.price) }}</span></div>
              </div>
            </div>
          </div>
        </section>

        <section class="qd-section" v-if="projectModules.length">
          <div class="qd-section-head">
            <span class="eyebrow">Tổng hợp</span>
            <h4>Bảng báo giá theo module</h4>
          </div>
          <div class="qd-summary">
            <div class="qd-summary-row" v-for="m in projectModules" :key="'s' + m.id">
              <div><span class="n">{{ m.name_snapshot }}</span></div>
              <div>{{ formatCurrency(m.price) }}</div>
            </div>
            <div class="qd-summary-total"><div>Tổng cộng trọn gói</div><div class="r">{{ formatCurrency(total) }}</div></div>
          </div>
        </section>

        <section class="qd-section" v-if="techRows.length">
          <div class="qd-section-head">
            <span class="eyebrow">Nền tảng kỹ thuật</span>
            <h4>Công nghệ sử dụng</h4>
          </div>
          <div class="qd-tech-grid">
            <span class="qd-tech-chip" v-for="t in techRows" :key="t.technology_id">{{ t.technologies?.name }}</span>
          </div>
        </section>

        <section class="qd-section">
          <div class="qd-section-head">
            <span class="eyebrow">Điều khoản</span>
            <h4>Cam kết &amp; bảo hành</h4>
          </div>
          <div class="qd-commit-box">
            <span class="qd-ribbon">Bảo hành {{ warrantyMonths }} tháng</span>
            <ul>
              <li><span class="ico">✓</span> Bảo hành miễn phí toàn bộ hệ thống trong <b>{{ warrantyMonths }} tháng</b> kể từ ngày bàn giao, bao gồm sửa lỗi phát sinh trong quá trình sử dụng.</li>
              <li><span class="ico">✓</span> Giá <b>trọn gói {{ formatCurrency(total) }}</b> — không phát sinh chi phí duy trì nào trong thời gian bảo hành.</li>
              <li><span class="ico">✓</span> Hỗ trợ điều chỉnh giao diện &amp; luồng thao tác cho sát với cách làm việc thực tế trong quá trình triển khai.</li>
            </ul>
            <div class="qd-note-box" v-if="settings?.quote_note">{{ settings.quote_note }}</div>
          </div>
        </section>

        <footer class="qd-footer">
          <div class="qd-signoff">
            <div class="qd-stamp-small">DUYỆT<br />GIÁ</div>
            <p>Phiếu báo giá có hiệu lực tham khảo triển khai dự án<br />{{ project.name }}</p>
          </div>
          <div class="qd-valid">{{ header.quote_number }} · Lập ngày {{ formatDate(header.quote_date) }} · {{ settings?.company_name }}</div>
        </footer>
      </div>
    </div>
    <div v-else class="loading">Đang tải...</div>
  `
};
