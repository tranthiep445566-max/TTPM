const { ref, onMounted } = Vue;
import { listNotifications, markAllRead } from '../api/notifications.js';
import { state, toast } from '../state.js';
import { formatDateTime } from '../utils.js';

export default {
  name: 'NotificationsPage',
  setup() {
    const rows = ref([]);
    const loading = ref(true);

    async function load() {
      loading.value = true;
      try {
        rows.value = await listNotifications();
      } catch (e) {
        toast(e.message, 'error');
      } finally {
        loading.value = false;
      }
    }

    async function markAll() {
      const unreadIds = rows.value.filter(n => !n.is_read).map(n => n.id);
      if (!unreadIds.length) return;
      await markAllRead(unreadIds);
      rows.value.forEach(n => { n.is_read = true; });
      state.unreadCount = 0;
    }

    onMounted(load);
    return { rows, loading, markAll, formatDateTime };
  },
  template: `
    <div class="page">
      <div class="page-header">
        <h2 class="page-title">Thông báo</h2>
        <button class="btn btn-sm" @click="markAll">Đánh dấu tất cả đã đọc</button>
      </div>
      <div v-if="loading" class="loading">Đang tải...</div>
      <div v-else class="detail-card">
        <div v-if="rows.length === 0" class="muted">Không có thông báo</div>
        <a v-for="n in rows" :key="n.id" class="list-item" :class="{ unread: !n.is_read }" :href="n.related_project_id ? '#/projects/' + n.related_project_id : '#/notifications'">
          <strong>{{ n.title }}</strong>
          <p>{{ n.message }}</p>
          <span class="muted small">{{ formatDateTime(n.created_at) }}</span>
        </a>
      </div>
    </div>
  `
};
