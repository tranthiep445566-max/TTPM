export default {
  name: 'Modal',
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: '' },
    size: { type: String, default: 'md' }
  },
  emits: ['update:modelValue'],
  methods: {
    close() { this.$emit('update:modelValue', false); }
  },
  template: `
    <teleport to="body">
      <div v-if="modelValue" class="modal-overlay" @click.self="close">
        <div class="modal-box" :class="'modal-' + size">
          <div class="modal-header">
            <h3>{{ title }}</h3>
            <button class="modal-close" @click="close">✕</button>
          </div>
          <div class="modal-body"><slot></slot></div>
          <div class="modal-footer" v-if="$slots.footer"><slot name="footer"></slot></div>
        </div>
      </div>
    </teleport>
  `
};
