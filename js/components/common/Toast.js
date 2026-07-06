import { state } from '../../state.js';

export default {
  name: 'ToastHost',
  setup() { return { state }; },
  template: `
    <teleport to="body">
      <div class="toast-host">
        <div v-for="t in state.toasts" :key="t.id" class="toast" :class="'toast-' + t.type">{{ t.message }}</div>
      </div>
    </teleport>
  `
};
