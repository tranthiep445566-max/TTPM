const { ref, reactive, computed, onMounted, onUnmounted } = Vue;
const { useRoute } = VueRouter;
import { state, can, toast } from '../state.js';
import { signOut, changePassword } from '../auth.js';
import { listNotifications, markRead, subscribeNotifications } from '../api/notifications.js';
import { getSettings } from '../api/settings.js';
import { roleLabel } from '../utils.js';
import ToastHost from './common/Toast.js';
import Modal from './common/Modal.js';

const NAV_ITEMS = [
  { module: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { module: 'customers', path: '/customers', label: 'Khách hàng', icon: '👥' },
  { module: 'projects', path: '/projects', label: 'Dự án', icon: '📁' },
  { module: 'quotes', path: '/quotes', label: 'Báo giá', icon: '🧾' },
  { module: 'modules_catalog', path: '/modules-catalog', label: 'Danh mục Module', icon: '🧩' },
  { module: 'technologies', path: '/technologies', label: 'Danh mục Công nghệ', icon: '⚙️' },
  { module: 'employees', path: '/employees', label: 'Nhân viên', icon: '🧑‍💼' },
  { module: 'commissions', path: '/commissions', label: 'Hoa hồng', icon: '💰' },
  { module: 'statistics', path: '/statistics', label: 'Thống kê', icon: '📊' },
  { module: 'notifications', path: '/notifications', label: 'Thông báo', icon: '🔔' },
  { module: 'audit_log', path: '/audit-log', label: 'Nhật ký thao tác', icon: '📜' },
  { module: 'permissions', path: '/permissions', label: 'Phân quyền', icon: '🔐' },
  { module: 'settings', path: '/settings', label: 'Cài đặt', icon: '🛠️' }
];

export default {
  name: 'AppShell',
  components: { ToastHost, Modal },
  setup() {
    const route = useRoute();
    const sidebarOpen = ref(false);
    const bellOpen = ref(false);
    const pwModalOpen = ref(false);
    const pwForm = reactive({ newPassword: '', confirmPassword: '' });
    let unsubscribe = null;

    const navItems = computed(() => NAV_ITEMS.filter(i => can(i.module, 'can_view')));
    const recentNotifications = computed(() => state.notifications.slice(0, 8));

    async function loadNotifications() {
      const rows = await listNotifications();
      state.notifications = rows;
      state.unreadCount = rows.filter(n => !n.is_read).length;
    }

    async function openBell() {
      bellOpen.value = !bellOpen.value;
    }

    async function readNotification(n) {
      if (!n.is_read) {
        await markRead(n.id);
        n.is_read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
      if (n.related_project_id) window.location.hash = '#/projects/' + n.related_project_id;
    }

    async function logout() {
      await signOut();
      window.location.hash = '#/login';
    }

    function openChangePassword() {
      Object.assign(pwForm, { newPassword: '', confirmPassword: '' });
      pwModalOpen.value = true;
    }

    async function submitChangePassword() {
      if (!pwForm.newPassword || pwForm.newPassword.length < 6) { toast('Mật khẩu mới phải từ 6 ký tự trở lên', 'error'); return; }
      if (pwForm.newPassword !== pwForm.confirmPassword) { toast('Mật khẩu nhập lại không khớp', 'error'); return; }
      try {
        await changePassword(pwForm.newPassword);
        toast('Đã đổi mật khẩu thành công');
        pwModalOpen.value = false;
      } catch (e) { toast(e.message, 'error'); }
    }

    onMounted(async () => {
      if (!state.companySettings) {
        try { state.companySettings = await getSettings(); } catch (e) { /* ignore */ }
      }
      await loadNotifications();
      unsubscribe = subscribeNotifications(n => {
        state.notifications.unshift(n);
        state.unreadCount++;
      });
    });
    onUnmounted(() => { if (unsubscribe) unsubscribe(); });

    return { state, route, sidebarOpen, bellOpen, pwModalOpen, pwForm, navItems, recentNotifications, openBell, readNotification, logout, roleLabel, openChangePassword, submitChangePassword };
  },
  template: `
    <div class="app-shell">
      <aside class="sidebar" :class="{ open: sidebarOpen }">
        <div class="sidebar-brand">
          <img v-if="state.companySettings?.logo_url" :src="state.companySettings.logo_url" class="brand-logo" />
          <span>{{ state.companySettings?.company_name || 'Phần mềm quản lý dự án' }}</span>
        </div>
        <nav class="sidebar-nav">
          <a v-for="item in navItems" :key="item.path" :href="'#' + item.path"
             @click="sidebarOpen = false"
             :class="{ active: route.path === item.path }">
            <span class="nav-icon">{{ item.icon }}</span> {{ item.label }}
          </a>
        </nav>
      </aside>
      <div class="sidebar-backdrop" v-if="sidebarOpen" @click="sidebarOpen = false"></div>
      <div class="main-area">
        <header class="topbar">
          <button class="icon-btn hamburger" @click="sidebarOpen = !sidebarOpen">☰</button>
          <div class="topbar-spacer"></div>
          <div class="notif-wrap">
            <button class="icon-btn" @click="openBell">
              🔔
              <span v-if="state.unreadCount" class="badge">{{ state.unreadCount }}</span>
            </button>
            <div v-if="bellOpen" class="notif-dropdown">
              <div v-if="recentNotifications.length === 0" class="notif-empty">Không có thông báo</div>
              <div v-for="n in recentNotifications" :key="n.id" class="notif-item" :class="{ unread: !n.is_read }" @click="readNotification(n)">
                <strong>{{ n.title }}</strong>
                <p>{{ n.message }}</p>
              </div>
              <a href="#/notifications" class="notif-viewall" @click="bellOpen = false">Xem tất cả</a>
            </div>
          </div>
          <div class="user-menu" v-if="state.profile">
            <span class="user-name">{{ state.profile.full_name }}</span>
            <span class="user-role">{{ roleLabel(state.profile.role) }}</span>
            <button class="btn btn-sm" @click="openChangePassword">Đổi mật khẩu</button>
            <button class="btn btn-sm" @click="logout">Đăng xuất</button>
          </div>
        </header>
        <main class="page-content">
          <router-view></router-view>
        </main>
      </div>
      <ToastHost />

      <Modal v-model="pwModalOpen" title="Đổi mật khẩu">
        <div class="form-group"><label>Mật khẩu mới *</label><input class="input" type="password" autocomplete="new-password" v-model="pwForm.newPassword" /></div>
        <div class="form-group"><label>Nhập lại mật khẩu mới *</label><input class="input" type="password" autocomplete="new-password" v-model="pwForm.confirmPassword" /></div>
        <template #footer>
          <button class="btn" @click="pwModalOpen = false">Hủy</button>
          <button class="btn btn-primary" @click="submitChangePassword">Đổi mật khẩu</button>
        </template>
      </Modal>
    </div>
  `
};
