import Modal from './Modal.js';

export default {
  name: 'ConfirmDialog',
  components: { Modal },
  props: {
    modelValue: { type: Boolean, default: false },
    title: { type: String, default: 'Xác nhận' },
    message: { type: String, default: 'Bạn có chắc chắn muốn thực hiện thao tác này?' }
  },
  emits: ['update:modelValue', 'confirm'],
  methods: {
    close() { this.$emit('update:modelValue', false); },
    confirm() { this.$emit('confirm'); this.close(); }
  },
  template: `
    <Modal :modelValue="modelValue" @update:modelValue="v => $emit('update:modelValue', v)" :title="title" size="sm">
      <p>{{ message }}</p>
      <template #footer>
        <button class="btn" @click="close">Hủy</button>
        <button class="btn btn-danger" @click="confirm">Xác nhận</button>
      </template>
    </Modal>
  `
};
