const { ref } = Vue;
import { signIn } from '../auth.js';

export default {
  name: 'Login',
  setup() {
    const email = ref('');
    const password = ref('');
    const error = ref('');
    const loading = ref(false);

    async function submit() {
      error.value = '';
      loading.value = true;
      try {
        await signIn(email.value, password.value);
        window.location.hash = '#/dashboard';
      } catch (e) {
        error.value = e.message || 'Đăng nhập thất bại';
      } finally {
        loading.value = false;
      }
    }

    return { email, password, error, loading, submit };
  },
  template: `
    <div class="auth-page">
      <div class="auth-box">
        <h2>Đăng nhập</h2>
        <div class="form-group">
          <label>Email</label>
          <input class="input" type="email" v-model="email" @keyup.enter="submit" />
        </div>
        <div class="form-group">
          <label>Mật khẩu</label>
          <input class="input" type="password" v-model="password" @keyup.enter="submit" />
        </div>
        <p class="error" v-if="error">{{ error }}</p>
        <button class="btn btn-primary btn-block" :disabled="loading" @click="submit">{{ loading ? 'Đang đăng nhập...' : 'Đăng nhập' }}</button>
        <p class="muted small">
          <a href="#/setup">Đổi cấu hình Supabase</a>
        </p>
      </div>
    </div>
  `
};
