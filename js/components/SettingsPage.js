const { ref, reactive, onMounted } = Vue;
import { getSettings, updateSettings, uploadLogo } from '../api/settings.js';
import { getConfig, saveConfig } from '../supabaseClient.js';
import { can, toast, state } from '../state.js';
import { buildVietQrUrlForAccount } from '../utils.js';

const BANKS = [
  { bin: '970436', name: 'Vietcombank' }, { bin: '970415', name: 'VietinBank' },
  { bin: '970418', name: 'BIDV' }, { bin: '970405', name: 'Agribank' },
  { bin: '970407', name: 'Techcombank' }, { bin: '970422', name: 'MBBank' },
  { bin: '970416', name: 'ACB' }, { bin: '970432', name: 'VPBank' },
  { bin: '970423', name: 'TPBank' }, { bin: '970403', name: 'Sacombank' },
  { bin: '970437', name: 'HDBank' }, { bin: '970443', name: 'SHB' },
  { bin: '970441', name: 'VIB' }, { bin: '970426', name: 'MSB' }
];

export default {
  name: 'SettingsPage',
  setup() {
    const loading = ref(true);
    const uploading = ref(false);
    const activeTab = ref('company');
    const form = reactive({});
    const sbConfig = reactive(getConfig());

    async function load() {
      loading.value = true;
      const s = await getSettings();
      Object.assign(form, s);
      loading.value = false;
    }

    async function save() {
      try {
        const updated = await updateSettings(form);
        state.companySettings = updated;
        toast('Đã lưu cài đặt');
      } catch (e) { toast(e.message, 'error'); }
    }

    async function onLogoChange(e) {
      const file = e.target.files[0];
      if (!file) return;
      uploading.value = true;
      try {
        form.logo_url = await uploadLogo(file);
        toast('Đã tải lên logo, nhớ bấm Lưu');
      } catch (err) { toast(err.message, 'error'); } finally { uploading.value = false; e.target.value = ''; }
    }

    function onBankSelect(bin) {
      const b = BANKS.find(x => x.bin === bin);
      form.bank_bin = bin;
      if (b) form.bank_name = b.name;
    }

    function saveSupabaseConfig() {
      if (!sbConfig.url.trim() || !sbConfig.anonKey.trim()) { toast('Nhập đủ URL và anon key', 'error'); return; }
      saveConfig(sbConfig.url, sbConfig.anonKey);
      toast('Đã lưu cấu hình Supabase, tải lại trang...');
      setTimeout(() => window.location.reload(), 1000);
    }

    onMounted(load);
    return { loading, uploading, activeTab, form, sbConfig, BANKS, can, save, onLogoChange, onBankSelect, saveSupabaseConfig, buildVietQrUrlForAccount };
  },
  template: `
    <div class="page">
      <div class="page-header"><h2 class="page-title">Cài đặt</h2></div>
      <div class="status-tabs">
        <button class="status-tab" :class="{active: activeTab==='company'}" @click="activeTab='company'">Công ty</button>
        <button class="status-tab" :class="{active: activeTab==='bank'}" @click="activeTab='bank'">Ngân hàng / QR</button>
        <button class="status-tab" :class="{active: activeTab==='quote'}" @click="activeTab='quote'">Báo giá &amp; Bảo hành</button>
        <button class="status-tab" :class="{active: activeTab==='ui'}" @click="activeTab='ui'">Giao diện</button>
        <button class="status-tab" :class="{active: activeTab==='supabase'}" @click="activeTab='supabase'">Kết nối Supabase</button>
      </div>

      <div v-if="loading" class="loading">Đang tải...</div>
      <template v-else>
        <div v-show="activeTab === 'company'" class="detail-card">
          <div class="form-group">
            <label>Logo</label>
            <img v-if="form.logo_url" :src="form.logo_url" class="logo-preview" />
            <input type="file" accept="image/*" @change="onLogoChange" :disabled="uploading" />
          </div>
          <div class="form-group"><label>Tên công ty</label><input class="input" v-model="form.company_name" /></div>
          <div class="form-group"><label>Địa chỉ</label><input class="input" v-model="form.address" /></div>
          <div class="form-row">
            <div class="form-group"><label>Điện thoại</label><input class="input" v-model="form.phone" /></div>
            <div class="form-group"><label>Email</label><input class="input" v-model="form.email" /></div>
          </div>
          <div class="form-group"><label>Website</label><input class="input" v-model="form.website" /></div>
          <button v-if="can('settings','can_edit')" class="btn btn-primary" @click="save">Lưu</button>
        </div>

        <div v-show="activeTab === 'bank'" class="detail-card">
          <div class="form-group">
            <label>Chọn ngân hàng nhanh</label>
            <select class="input" @change="onBankSelect($event.target.value)">
              <option value="">-- Chọn ngân hàng --</option>
              <option v-for="b in BANKS" :key="b.bin" :value="b.bin">{{ b.name }}</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Tên ngân hàng</label><input class="input" v-model="form.bank_name" /></div>
            <div class="form-group"><label>Mã BIN</label><input class="input" v-model="form.bank_bin" /></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Số tài khoản</label><input class="input" v-model="form.bank_account_number" /></div>
            <div class="form-group"><label>Chủ tài khoản</label><input class="input" v-model="form.bank_account_holder" /></div>
          </div>
          <button v-if="can('settings','can_edit')" class="btn btn-primary" @click="save">Lưu</button>
          <div v-if="form.bank_bin && form.bank_account_number" style="margin-top:16px">
            <p class="muted">Xem trước QR (số tiền mẫu 100.000đ):</p>
            <img :src="buildVietQrUrlForAccount(form.bank_bin, form.bank_account_number, form.bank_account_holder, 100000, 'Test QR')" class="qr-image" />
          </div>
        </div>

        <div v-show="activeTab === 'quote'" class="detail-card">
          <div class="form-group"><label>Mẫu ghi chú báo giá</label><textarea class="input" rows="3" v-model="form.quote_note"></textarea></div>
          <div class="form-group"><label>Điều khoản hợp đồng</label><textarea class="input" rows="5" v-model="form.contract_terms"></textarea></div>
          <div class="form-group"><label>Thời gian bảo hành mặc định (tháng)</label><input class="input" type="number" v-model.number="form.default_warranty_months" /></div>
          <button v-if="can('settings','can_edit')" class="btn btn-primary" @click="save">Lưu</button>
        </div>

        <div v-show="activeTab === 'ui'" class="detail-card">
          <div class="form-group"><label>Màu giao diện</label><input class="input" type="color" v-model="form.theme_color" style="max-width:100px" /></div>
          <div class="form-group">
            <label>Đơn vị tiền tệ</label>
            <select class="input" v-model="form.currency"><option value="VND">VND</option><option value="USD">USD</option></select>
          </div>
          <button v-if="can('settings','can_edit')" class="btn btn-primary" @click="save">Lưu</button>
        </div>

        <div v-show="activeTab === 'supabase'" class="detail-card">
          <p class="muted">Thông tin kết nối tới Supabase project. Lấy trong Supabase Dashboard &gt; Settings &gt; API.</p>
          <div class="form-group"><label>Project URL</label><input class="input" v-model="sbConfig.url" /></div>
          <div class="form-group"><label>Anon public key</label><input class="input" v-model="sbConfig.anonKey" /></div>
          <button class="btn btn-primary" @click="saveSupabaseConfig">Lưu &amp; tải lại</button>
        </div>
      </template>
    </div>
  `
};
