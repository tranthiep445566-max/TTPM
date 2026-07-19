const { computed, ref, watch } = Vue;

export default {
  name: 'DataTable',
  props: {
    columns: { type: Array, required: true },
    rows: { type: Array, required: true },
    searchKeys: { type: Array, default: () => [] },
    pageSize: { type: Number, default: 10 }
  },
  setup(props) {
    const search = ref('');
    const page = ref(1);
    const sortKey = ref('');
    const sortDir = ref(1);

    watch(() => props.rows, () => { page.value = 1; });
    watch(search, () => { page.value = 1; });

    const keysForSearch = computed(() => props.searchKeys.length ? props.searchKeys : props.columns.map(c => c.key));

    const filtered = computed(() => {
      if (!search.value.trim()) return props.rows;
      const q = search.value.trim().toLowerCase();
      return props.rows.filter(row => keysForSearch.value.some(k => String(row[k] ?? '').toLowerCase().includes(q)));
    });

    const sorted = computed(() => {
      if (!sortKey.value) return filtered.value;
      const arr = [...filtered.value];
      arr.sort((a, b) => {
        const av = a[sortKey.value], bv = b[sortKey.value];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sortDir.value;
        return String(av).localeCompare(String(bv)) * sortDir.value;
      });
      return arr;
    });

    const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / props.pageSize)));

    const paged = computed(() => {
      const start = (page.value - 1) * props.pageSize;
      return sorted.value.slice(start, start + props.pageSize);
    });

    function toggleSort(col) {
      if (!col.sortable) return;
      if (sortKey.value === col.key) { sortDir.value *= -1; }
      else { sortKey.value = col.key; sortDir.value = 1; }
    }

    function prevPage() { if (page.value > 1) page.value--; }
    function nextPage() { if (page.value < totalPages.value) page.value++; }

    return { search, page, sortKey, sortDir, filtered, sorted, paged, totalPages, toggleSort, prevPage, nextPage };
  },
  template: `
    <div class="datatable">
      <div class="datatable-toolbar">
        <input class="input" type="text" v-model="search" placeholder="Tìm kiếm..." />
        <div class="datatable-toolbar-slot"><slot name="toolbar"></slot></div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th v-for="col in columns" :key="col.key" @click="toggleSort(col)" :class="{ sortable: col.sortable }">
                {{ col.label }}
                <span v-if="sortKey === col.key">{{ sortDir === 1 ? '▲' : '▼' }}</span>
              </th>
              <th v-if="$slots.actions"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in paged" :key="row.id">
              <td v-for="col in columns" :key="col.key">
                <slot :name="'col-' + col.key" :row="row">{{ col.format ? col.format(row) : row[col.key] }}</slot>
              </td>
              <td v-if="$slots.actions" class="row-actions"><slot name="actions" :row="row"></slot></td>
            </tr>
            <tr v-if="paged.length === 0"><td :colspan="columns.length + 1" class="empty-cell">Không có dữ liệu</td></tr>
          </tbody>
        </table>
      </div>
      <div class="datatable-pagination" v-if="totalPages > 1">
        <button class="btn btn-sm" @click="prevPage" :disabled="page === 1">‹ Trước</button>
        <span>Trang {{ page }} / {{ totalPages }}</span>
        <button class="btn btn-sm" @click="nextPage" :disabled="page === totalPages">Sau ›</button>
      </div>
    </div>
  `
};
