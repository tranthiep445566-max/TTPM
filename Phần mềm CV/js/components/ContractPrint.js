const { ref, reactive, computed, onMounted } = Vue;
const { useRoute } = VueRouter;
import { getProject, updateProject, listProjectModules, listInstallments } from '../api/projects.js';
import { listModules } from '../api/modulesCatalog.js';
import { getSettings } from '../api/settings.js';
import { can, toast } from '../state.js';
import { formatCurrency, formatDate, numberToVietnameseWords } from '../utils.js';

function todayIso() { return new Date().toISOString().slice(0, 10); }

function dateParts(iso) {
  if (!iso) return { day: '……', month: '……', year: '……………' };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { day: '……', month: '……', year: '……………' };
  return { day: String(d.getDate()).padStart(2, '0'), month: String(d.getMonth() + 1).padStart(2, '0'), year: d.getFullYear() };
}

function monthsBetween(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso), end = new Date(endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30)));
}

const DOC_STYLE = `
body{font-family:'Times New Roman',Georgia,serif;font-size:14.5pt;line-height:1.5;color:#1a1a1a;}
.cd-center{text-align:center}
.cd-national{font-weight:700;text-transform:uppercase;text-align:center;margin:0}
.cd-slogan{text-align:center;font-weight:600;margin:2px 0 14px}
.cd-doc-title{text-align:center;font-weight:800;font-size:19pt;text-transform:uppercase;margin:20px 0 4px}
.cd-doc-subtitle{text-align:center;font-weight:700;margin:0 0 4px}
.cd-doc-number{text-align:center;font-style:italic;margin:0 0 16px;font-size:11pt}
.cd-party{margin:14px 0}
.cd-party-title{font-weight:800;text-transform:uppercase;margin:0 0 6px}
.cd-party p{margin:3px 0}
.cd-article{margin:16px 0}
.cd-article-title{font-weight:800;text-transform:uppercase;margin:0 0 8px}
.cd-article p,.cd-article li{margin:6px 0;text-align:justify}
.cd-table{width:100%;border-collapse:collapse;margin:8px 0;font-size:11pt}
.cd-table th,.cd-table td{border:1px solid #333;padding:6px 8px;text-align:left;vertical-align:top}
.cd-table th{background:#f1f1f1;font-weight:700;text-align:center}
.cd-table td.num,.cd-table th.num{text-align:center;width:36px}
.cd-table td.money,.cd-table th.money{text-align:right;white-space:nowrap}
.cd-table tfoot td{font-weight:800;text-align:right;background:#f8f8f8}
.cd-appendix-title{text-align:center;font-weight:800;text-transform:uppercase;margin:26px 0 2px}
.cd-appendix-sub{text-align:center;font-weight:600;margin:0 0 12px}
.cd-signature{display:flex;justify-content:space-between;margin-top:36px;text-align:center}
.cd-signature>div{flex:1}
.cd-signature b{text-transform:uppercase;display:block;margin-bottom:6px}
.cd-signature .cd-sign-hint{font-style:italic;font-size:11pt;display:block;margin-bottom:66px}
`;

export default {
  name: 'ContractPrint',
  setup() {
    const route = useRoute();
    const projectId = route.params.id;
    const loading = ref(true);
    const project = ref(null);
    const projectModules = ref([]);
    const catalog = ref([]);
    const installments = ref([]);
    const settings = ref(null);

    const header = reactive({ contract_number: '', contract_signed_date: '', acceptance_days: 3 });

    async function load() {
      loading.value = true;
      try {
        const [proj, pMods, cat, insts, s] = await Promise.all([
          getProject(projectId), listProjectModules(projectId), listModules(),
          listInstallments(projectId), getSettings()
        ]);
        project.value = proj;
        projectModules.value = pMods;
        catalog.value = cat;
        installments.value = insts;
        settings.value = s;
        header.contract_number = proj.contract_number || ('HĐPM-' + proj.code);
        header.contract_signed_date = proj.contract_signed_date || todayIso();
        header.acceptance_days = proj.acceptance_days || 3;
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        loading.value = false;
      }
    }

    function catalogFor(moduleId) {
      return catalog.value.find(m => m.id === moduleId) || null;
    }

    const total = computed(() => project.value ? Number(project.value.total_amount || 0) : 0);
    const totalWords = computed(() => numberToVietnameseWords(total.value));
    const signDate = computed(() => dateParts(header.contract_signed_date));
    const durationMonths = computed(() => monthsBetween(project.value?.start_date, project.value?.deadline_date));
    const partyA = computed(() => project.value?.customers || {});
    const partyB = computed(() => settings.value || {});

    async function saveHeader() {
      try {
        await updateProject(projectId, {
          contract_number: header.contract_number, contract_signed_date: header.contract_signed_date,
          acceptance_days: header.acceptance_days
        });
        toast('Đã lưu số hợp đồng');
        await load();
      } catch (e) { toast(e.message, 'error'); }
    }

    function doPrint() { window.print(); }

    function exportDoc() {
      const area = document.getElementById('contract-print-area');
      if (!area) return;
      const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset="utf-8"><title>${header.contract_number}</title><style>${DOC_STYLE}</style></head>
        <body>${area.innerHTML}</body></html>`;
      const blob = new Blob(['﻿', html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${header.contract_number || 'hop-dong'}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    onMounted(load);

    return {
      loading, project, projectModules, installments, settings, header, total, totalWords, signDate,
      durationMonths, partyA, partyB, can, catalogFor, saveHeader, doPrint, exportDoc,
      formatCurrency, formatDate
    };
  },
  template: `
    <div class="page" v-if="!loading && project">
      <div class="page-header no-print">
        <h2 class="page-title">Xuất hợp đồng — {{ project.name }}</h2>
        <a :href="'#/projects/' + project.id" class="btn btn-sm">← Quay lại dự án</a>
      </div>

      <div class="export-toolbar no-print">
        <div class="form-group">
          <label>Số hợp đồng</label>
          <input class="input" v-model="header.contract_number" />
        </div>
        <div class="form-group">
          <label>Ngày ký</label>
          <input class="input" type="date" v-model="header.contract_signed_date" />
        </div>
        <div class="form-group" style="max-width:140px">
          <label>Số ngày nghiệm thu</label>
          <input class="input" type="number" v-model.number="header.acceptance_days" />
        </div>
        <div class="export-toolbar-spacer"></div>
        <button v-if="can('projects','can_edit')" class="btn" @click="saveHeader">Lưu số / ngày</button>
        <button class="btn" @click="exportDoc">⬇️ Tải file Word (.doc)</button>
        <button class="btn btn-primary" @click="doPrint">🖨️ In / Lưu PDF</button>
      </div>

      <div class="contract-doc" id="contract-print-area">
        <p class="cd-national">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
        <p class="cd-slogan">Độc lập – Tự do – Hạnh phúc</p>

        <h1 class="cd-doc-title">Hợp đồng cung cấp phần mềm</h1>
        <p class="cd-doc-subtitle">{{ project.name }}</p>
        <p class="cd-doc-number">Số: {{ header.contract_number }}</p>

        <div class="cd-article">
          <p>Căn cứ Bộ luật Dân sự nước Cộng hoà xã hội chủ nghĩa Việt Nam;</p>
          <p>Căn cứ nhu cầu và khả năng thực tế của hai bên;</p>
          <p>Hôm nay, ngày {{ signDate.day }} tháng {{ signDate.month }} năm {{ signDate.year }}, tại {{ partyB.address || '……………………' }}, chúng tôi gồm có:</p>
        </div>

        <div class="cd-party">
          <p class="cd-party-title">Bên A (Bên đặt hàng / Khách hàng)</p>
          <p>Tên đơn vị/cá nhân: <b>{{ partyA.company_name }}</b></p>
          <p>Địa chỉ: {{ partyA.address || '……………………' }}</p>
          <p>Mã số thuế: {{ partyA.tax_code || '……………………' }}</p>
          <p>Đại diện: {{ partyA.representative_name || partyA.contact_person || '……………………' }}&emsp;&emsp;Chức vụ: {{ partyA.representative_position || '……………' }}</p>
          <p>Điện thoại: {{ partyA.phone || '……………' }}&emsp;&emsp;Email: {{ partyA.email || '……………' }}</p>
          <p>Sau đây gọi là "Bên A".</p>
        </div>

        <div class="cd-party">
          <p class="cd-party-title">Bên B (Bên cung cấp phần mềm)</p>
          <p>Tên đơn vị/cá nhân: <b>{{ partyB.company_name }}</b></p>
          <p>Địa chỉ: {{ partyB.address || '……………………' }}</p>
          <p>Mã số thuế: {{ partyB.tax_code || '……………………' }}</p>
          <p>Đại diện: {{ partyB.representative_name || '……………………' }}&emsp;&emsp;Chức vụ: {{ partyB.representative_position || '……………' }}</p>
          <p>Điện thoại: {{ partyB.phone || '……………' }}&emsp;&emsp;Email: {{ partyB.email || '……………' }}</p>
          <p>Sau đây gọi là "Bên B".</p>
        </div>

        <p>Hai bên thống nhất ký kết Hợp đồng cung cấp phần mềm với các điều khoản sau đây:</p>

        <div class="cd-article">
          <p class="cd-article-title">Điều 1: Đối tượng hợp đồng</p>
          <p>Bên B thực hiện xây dựng và bàn giao cho Bên A hệ thống "{{ project.name }}" (sau đây gọi là "Phần mềm"), bao gồm {{ projectModules.length }} module chức năng theo Phụ lục 1 đính kèm, cụ thể gồm:</p>
          <ol>
            <li v-for="m in projectModules" :key="m.id">{{ m.name_snapshot }}</li>
          </ol>
          <p>Chi tiết chức năng của từng module được quy định tại Phụ lục 1 — không tách rời Hợp đồng này.</p>
        </div>

        <div class="cd-article">
          <p class="cd-article-title">Điều 2: Giá trị hợp đồng và phương thức thanh toán</p>
          <p>Tổng giá trị hợp đồng (trọn gói, đã bao gồm toàn bộ {{ projectModules.length }} module tại Điều 1): <b>{{ formatCurrency(total) }}</b> (Bằng chữ: {{ totalWords }}).</p>
          <p>Giá trị hợp đồng là giá trọn gói cho phạm vi công việc tại Phụ lục 1. Trong thời gian bảo hành theo Điều 4, Bên A không phát sinh thêm bất kỳ chi phí duy trì nào ngoài giá trị hợp đồng này.</p>
          <template v-if="installments.length">
            <p>Thanh toán được chia làm {{ installments.length }} đợt như sau:</p>
            <table class="cd-table">
              <thead><tr><th>Đợt</th><th>Tỷ lệ</th><th>Số tiền</th><th>Thời điểm thanh toán</th></tr></thead>
              <tbody>
                <tr v-for="i in installments" :key="i.id">
                  <td>{{ i.name }}</td>
                  <td class="num">{{ i.percent ? i.percent + '%' : '—' }}</td>
                  <td class="money">{{ formatCurrency(i.amount) }}</td>
                  <td>{{ i.due_note || '……………………' }}</td>
                </tr>
              </tbody>
            </table>
          </template>
          <p v-else><i>(Chưa thiết lập đợt thanh toán — vào tab "Tài chính" của dự án để thêm trước khi phát hành hợp đồng chính thức.)</i></p>
          <p>Hình thức thanh toán: chuyển khoản ngân hàng theo thông tin dưới đây, hoặc hình thức khác do hai bên thống nhất bằng văn bản.</p>
          <table class="cd-table" v-if="partyB.bank_name || partyB.bank_account_number">
            <tbody>
              <tr><td style="width:180px"><b>Ngân hàng</b></td><td>{{ partyB.bank_name || '……………' }}</td></tr>
              <tr><td><b>Số tài khoản</b></td><td>{{ partyB.bank_account_number || '……………' }}</td></tr>
              <tr><td><b>Chủ tài khoản</b></td><td>{{ partyB.bank_account_holder || '……………' }}</td></tr>
              <tr><td><b>Nội dung chuyển khoản</b></td><td>{{ project.code }} + số đợt thanh toán</td></tr>
            </tbody>
          </table>
          <p>Bên A ghi đúng nội dung chuyển khoản theo mẫu trên (thay số đợt tương ứng) để hai bên dễ đối chiếu, tránh nhầm lẫn giữa các đợt thanh toán.</p>
          <p>Nếu Bên A chậm thanh toán các đợt tiếp theo quá 03 (ba) ngày làm việc kể từ mốc quy định, Bên B có quyền tạm dừng triển khai cho đến khi nhận đủ thanh toán; thời gian tạm dừng không tính vào tiến độ thực hiện tại Điều 3 và không bị coi là vi phạm của Bên B.</p>
        </div>

        <div class="cd-article">
          <p class="cd-article-title">Điều 3: Thời gian và tiến độ thực hiện</p>
          <p>Thời gian thực hiện: <b>{{ durationMonths ? durationMonths + ' tháng' : '…… tháng' }}</b>, tính từ ngày đầu tiên mà cả hai điều kiện sau được đáp ứng:</p>
          <ol>
            <li>Bên B nhận đủ tiền cọc đợt đầu theo Điều 2;</li>
            <li>Bên A cung cấp đầy đủ thông tin, dữ liệu, mẫu biểu, yêu cầu nghiệp vụ cần thiết để Bên B triển khai.</li>
          </ol>
          <p>Trường hợp Bên A cung cấp thông tin chậm, thiếu, hoặc thay đổi yêu cầu sau khi đã thống nhất tại Phụ lục 1, thời gian thực hiện được gia hạn tương ứng với số ngày chậm trễ hoặc khối lượng thay đổi phát sinh; việc gia hạn này không được tính là vi phạm tiến độ của Bên B.</p>
          <p>Kết thúc thời gian thực hiện, Bên B bàn giao Phần mềm để Bên A kiểm tra, nghiệm thu trong vòng {{ header.acceptance_days }} (ngày làm việc). Quá thời hạn này mà Bên A không phản hồi bằng văn bản, Phần mềm được mặc nhiên coi là đã nghiệm thu.</p>
        </div>

        <div class="cd-article">
          <p class="cd-article-title">Điều 4: Bảo hành</p>
          <p>Bên B bảo hành Phần mềm trong thời hạn <b>{{ project.warranty_months || 0 }} tháng</b> kể từ ngày nghiệm thu{{ project.warranty_end_date ? ' (dự kiến đến ngày ' + formatDate(project.warranty_end_date) + ')' : '' }}, bao gồm sửa lỗi kỹ thuật phát sinh từ mã nguồn do Bên B xây dựng, không phát sinh thêm bất kỳ chi phí nào cho Bên A trong thời gian này.</p>
          <p>Bên B không có nghĩa vụ bảo hành đối với các thay đổi do bên thứ ba hoặc Bên A tự thực hiện trên phần mềm.</p>
          <p>Phạm vi bảo hành không bao gồm:</p>
          <ul>
            <li>Yêu cầu bổ sung chức năng mới ngoài phạm vi Phụ lục 1;</li>
            <li>Lỗi phát sinh do Bên A tự ý chỉnh sửa dữ liệu, mã nguồn, cấu hình hệ thống;</li>
            <li>Lỗi phát sinh do hạ tầng, mạng internet, thiết bị của Bên A.</li>
          </ul>
          <p>Các nội dung nêu trên (nếu có) sẽ được hai bên trao đổi và báo giá riêng theo Điều 5.</p>
        </div>

        <div class="cd-article">
          <p class="cd-article-title">Điều 5: Thay đổi yêu cầu và phát sinh ngoài phạm vi</p>
          <p>Trong quá trình triển khai, các chức năng chi tiết của từng module có thể được điều chỉnh cho phù hợp với thực tế sử dụng của Bên A, trên cơ sở hai bên thống nhất bằng văn bản (tin nhắn, email đều được công nhận là văn bản hợp lệ).</p>
          <p>Nếu phát sinh module hoặc chức năng nằm ngoài phạm vi tại Phụ lục 1, hai bên sẽ thoả thuận báo giá và thời gian thực hiện riêng cho phần phát sinh; phần phát sinh không tính vào giá trị {{ formatCurrency(total) }} và không tính vào thời hạn tại Điều 3.</p>
        </div>

        <div class="cd-article">
          <p class="cd-article-title">Điều 6: Hoàn cọc và xử lý vi phạm</p>
          <p>Trường hợp Bên B không hoàn thành bàn giao Phần mềm đúng thời hạn tại Điều 3, hoặc Phần mềm không thể đưa vào sử dụng do lỗi kỹ thuật nghiêm trọng và Bên B không khắc phục được trong thời hạn 15 ngày làm việc kể từ khi nhận được thông báo của Bên A, đồng thời nguyên nhân được xác định là lỗi thuộc về Bên B, Bên B có trách nhiệm hoàn trả 100% số tiền cọc đã nhận cho Bên A trong vòng 07 (bảy) ngày làm việc kể từ ngày hai bên xác nhận lỗi thuộc về Bên B.</p>
          <p>Điều khoản hoàn cọc tại khoản trên không áp dụng đối với các trường hợp sau (không thuộc lỗi của Bên B):</p>
          <ul>
            <li>Chậm trễ do Bên A cung cấp thiếu, sai, hoặc chậm thông tin/dữ liệu cần thiết;</li>
            <li>Chậm trễ do Bên A thay đổi yêu cầu nhiều lần hoặc bổ sung phạm vi công việc;</li>
            <li>Chậm thanh toán các đợt theo Điều 2;</li>
            <li>Sự kiện bất khả kháng theo Điều 7;</li>
            <li>Bên A đơn phương chấm dứt hợp đồng khi Bên B chưa vi phạm nghĩa vụ.</li>
          </ul>
          <p>Trường hợp Bên A đơn phương chấm dứt hợp đồng khi không phải lỗi của Bên B, Bên A không được hoàn lại phần cọc tương ứng với khối lượng công việc Bên B đã thực hiện tính đến thời điểm chấm dứt.</p>
        </div>

        <div class="cd-article">
          <p class="cd-article-title">Điều 7: Sự kiện bất khả kháng</p>
          <p>Hai bên được miễn trừ trách nhiệm nếu việc chậm trễ hoặc không thực hiện được nghĩa vụ hợp đồng là do sự kiện bất khả kháng (thiên tai, dịch bệnh, hoả hoạn, mất điện/mất kết nối internet diện rộng, sự cố hạ tầng của bên thứ ba…) nằm ngoài khả năng kiểm soát hợp lý của các bên. Thời gian thực hiện hợp đồng được gia hạn tương ứng với thời gian xảy ra sự kiện bất khả kháng.</p>
        </div>

        <div class="cd-article">
          <p class="cd-article-title">Điều 8: Bản quyền và bảo mật</p>
          <p>Mã nguồn, thiết kế cơ sở dữ liệu và tài liệu kỹ thuật của Phần mềm thuộc quyền sở hữu của Bên B cho đến khi Bên A thanh toán đủ 100% giá trị hợp đồng. Sau khi thanh toán đủ, Bên A được toàn quyền sử dụng Phần mềm không độc quyền phục vụ cho mục đích kinh doanh nội bộ của mình.</p>
          <p>Bên B vẫn giữ quyền sở hữu các thư viện, framework, thuật toán, source code nền tảng và các thành phần được sử dụng chung cho nhiều khách hàng.</p>
          <p>Hai bên cam kết bảo mật thông tin, dữ liệu kinh doanh của nhau trong quá trình hợp tác và không tiết lộ cho bên thứ ba khi chưa được sự đồng ý bằng văn bản, trừ trường hợp pháp luật yêu cầu.</p>
        </div>

        <div class="cd-article">
          <p class="cd-article-title">Điều 9: Trách nhiệm và giới hạn bồi thường</p>
          <p>Bên B chịu trách nhiệm đảm bảo Phần mềm hoạt động đúng chức năng như mô tả tại Phụ lục 1. Bên B không chịu trách nhiệm đối với các thiệt hại gián tiếp, mất doanh thu, mất dữ liệu do Bên A vận hành sai quy trình hoặc không tuân thủ hướng dẫn sử dụng.</p>
          <p>Trong mọi trường hợp, tổng trách nhiệm bồi thường (nếu có) của Bên B theo Hợp đồng này không vượt quá tổng giá trị hợp đồng quy định tại Điều 2 ({{ formatCurrency(total) }}).</p>
        </div>

        <div class="cd-article">
          <p class="cd-article-title">Điều 10: Giải quyết tranh chấp</p>
          <p>Mọi tranh chấp phát sinh từ Hợp đồng này trước hết sẽ được hai bên thương lượng, hoà giải trên tinh thần hợp tác. Trường hợp không thống nhất được, tranh chấp sẽ được giải quyết tại Toà án có thẩm quyền theo quy định pháp luật Việt Nam.</p>
        </div>

        <div class="cd-article">
          <p class="cd-article-title">Điều 11: Điều khoản chung và hiệu lực</p>
          <p>Hợp đồng có hiệu lực kể từ ngày ký và Bên A hoàn tất thanh toán đợt đầu tiên.</p>
          <p>Hợp đồng được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản.</p>
          <p>Mọi sửa đổi, bổ sung Hợp đồng chỉ có hiệu lực khi được lập thành văn bản và có chữ ký của hai bên.</p>
        </div>

        <div class="cd-article" v-if="settings?.contract_terms">
          <p class="cd-article-title">Điều 12: Điều khoản bổ sung</p>
          <p style="white-space:pre-wrap">{{ settings.contract_terms }}</p>
        </div>

        <h2 class="cd-appendix-title">Phụ lục 1</h2>
        <p class="cd-appendix-sub">Bảng chi tiết module chức năng &amp; giá trị thanh toán</p>
        <table class="cd-table">
          <thead><tr><th class="num">STT</th><th>Module</th><th>Nội dung chính</th><th class="money">Giá trị</th></tr></thead>
          <tbody>
            <tr v-for="(m, idx) in projectModules" :key="m.id">
              <td class="num">{{ idx + 1 }}</td>
              <td>{{ m.name_snapshot }}</td>
              <td>
                <ul v-if="catalogFor(m.module_id) && catalogFor(m.module_id).module_features && catalogFor(m.module_id).module_features.length">
                  <li v-for="f in catalogFor(m.module_id).module_features" :key="f.id">{{ f.name }}</li>
                </ul>
                <span v-else>{{ m.note || '—' }}</span>
              </td>
              <td class="money">{{ formatCurrency(m.price) }}</td>
            </tr>
          </tbody>
          <tfoot><tr><td colspan="3">TỔNG CỘNG</td><td class="money">{{ formatCurrency(total) }}</td></tr></tfoot>
        </table>
        <p><i>Ghi chú: Nội dung chi tiết từng chức năng có thể được điều chỉnh trong quá trình triển khai theo Điều 5 của Hợp đồng, không làm thay đổi tổng giá trị hợp đồng tại bảng trên.</i></p>

        <div class="cd-signature">
          <div><b>Đại diện Bên A</b><span class="cd-sign-hint">(Ký, ghi rõ họ tên)</span></div>
          <div><b>Đại diện Bên B</b><span class="cd-sign-hint">(Ký, ghi rõ họ tên)</span></div>
        </div>
      </div>
    </div>
    <div v-else class="loading">Đang tải...</div>
  `
};
