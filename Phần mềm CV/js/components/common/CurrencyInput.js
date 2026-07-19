const { ref, watch, nextTick } = Vue;

function parseDigits(str) {
  const digits = String(str || '').replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function formatDisplay(num) {
  const n = Number(num) || 0;
  return n === 0 ? '' : n.toLocaleString('vi-VN');
}

export default {
  name: 'CurrencyInput',
  props: {
    modelValue: { type: [Number, String], default: 0 },
    placeholder: { type: String, default: '0' },
    disabled: { type: Boolean, default: false }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const display = ref(formatDisplay(props.modelValue));

    watch(() => props.modelValue, (v) => {
      if (parseDigits(display.value) !== Number(v || 0)) display.value = formatDisplay(v);
    });

    function onInput(e) {
      const input = e.target;
      const caretFromEnd = input.value.length - input.selectionStart;
      const num = parseDigits(input.value);
      const formatted = formatDisplay(num);
      display.value = formatted;
      emit('update:modelValue', num);
      nextTick(() => {
        const pos = Math.max(0, formatted.length - caretFromEnd);
        input.setSelectionRange(pos, pos);
      });
    }

    return { display, onInput };
  },
  template: `<input class="input" type="text" inputmode="numeric" autocomplete="off" :value="display" @input="onInput" :placeholder="placeholder" :disabled="disabled" />`
};
