const { ref } = Vue;
import { saveConfig, getConfig } from '../supabaseClient.js';

export default {
  name: 'Setup',
  setup() {
    const cfg = getConfig();
    const url = ref(cfg.url);
    const anonKey = ref(cfg.anonKey);
    const error = ref('');

    function save() {
      if (!url.value.trim() || !anonKey.value.trim()) {
        error.value = 'Vui lòng nhập đầy đủ Project URL và anon key.';
        return;
      }
      saveConfig(url.value, anonKey.value);
      window.location.hash = '#/login';
      window.location.reload();
    }

    return { url, anonKey, error, save };
  },
  template: `
    <div class="auth-page">
      <div class="auth-box">
        <h2>Cấu hình kết nối Supabase</h2>
        <p class="muted">Lấy thông tin này trong Supabase Dashboard &gt; Settings &gt; API.</p>
        <div class="form-group">
          <label>Project URL</label>
          <input class="input" v-model="url" placeholder="https://xxxxx.supabase.co" />
        </div>
        <div class="form-group">
          <label>Anon public key</label>
          <input class="input" v-model="anonKey" placeholder="eyJhbGciOi..." />
        </div>
        <p class="error" v-if="error">{{ error }}</p>
        <button class="btn btn-primary btn-block" @click="save">Lưu và tiếp tục</button>
      </div>
    </div>
  `
};
