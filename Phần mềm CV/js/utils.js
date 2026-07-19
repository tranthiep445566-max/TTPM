export function formatCurrency(v) {
  const n = Number(v) || 0;
  return n.toLocaleString('vi-VN') + ' đ';
}

export function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('vi-VN');
}

export function formatDateTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleString('vi-VN');
}

export function daysLeft(d) {
  if (!d) return null;
  const target = new Date(d);
  const now = new Date();
  target.setHours(0,0,0,0);
  now.setHours(0,0,0,0);
  return Math.round((target - now) / 86400000);
}

export function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

export const PROJECT_STATUS_OPTIONS = [
  { value: 'cho_bao_gia', label: 'Chờ báo giá', color: '#94a3b8' },
  { value: 'da_gui_bao_gia', label: 'Đã gửi báo giá', color: '#60a5fa' },
  { value: 'cho_coc', label: 'Chờ cọc', color: '#fbbf24' },
  { value: 'da_coc', label: 'Đã cọc', color: '#38bdf8' },
  { value: 'dang_phan_tich', label: 'Đang phân tích', color: '#a78bfa' },
  { value: 'dang_thiet_ke', label: 'Đang thiết kế', color: '#818cf8' },
  { value: 'dang_lap_trinh', label: 'Đang lập trình', color: '#6366f1' },
  { value: 'dang_kiem_thu', label: 'Đang kiểm thử', color: '#f472b6' },
  { value: 'cho_ban_giao', label: 'Chờ bàn giao', color: '#fb923c' },
  { value: 'da_ban_giao', label: 'Đã bàn giao', color: '#34d399' },
  { value: 'dang_bao_hanh', label: 'Đang bảo hành', color: '#2dd4bf' },
  { value: 'hoan_thanh', label: 'Hoàn thành', color: '#22c55e' },
  { value: 'tam_dung', label: 'Tạm dừng', color: '#a8a29e' },
  { value: 'huy', label: 'Hủy', color: '#ef4444' }
];

export function statusLabel(value) {
  const f = PROJECT_STATUS_OPTIONS.find(s => s.value === value);
  return f ? f.label : value;
}

export function statusColor(value) {
  const f = PROJECT_STATUS_OPTIONS.find(s => s.value === value);
  return f ? f.color : '#94a3b8';
}

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'sale', label: 'Sale' },
  { value: 'developer', label: 'Developer' },
  { value: 'accountant', label: 'Kế toán' }
];

export function roleLabel(value) {
  const f = ROLE_OPTIONS.find(r => r.value === value);
  return f ? f.label : value;
}

export const MODULE_LABELS = {
  dashboard: 'Dashboard', customers: 'Khách hàng', projects: 'Dự án', quotes: 'Báo giá',
  modules_catalog: 'Danh mục Module', technologies: 'Danh mục Công nghệ', employees: 'Nhân viên',
  commissions: 'Hoa hồng', statistics: 'Thống kê', notifications: 'Thông báo',
  audit_log: 'Nhật ký thao tác', permissions: 'Phân quyền', settings: 'Cài đặt'
};

export function buildVietQrUrl(settings, amount, message) {
  if (!settings || !settings.bank_bin || !settings.bank_account_number) return '';
  const params = new URLSearchParams({
    amount: Math.round(amount) || '',
    addInfo: message || '',
    accountName: settings.bank_account_holder || ''
  });
  return `https://img.vietqr.io/image/${settings.bank_bin}-${settings.bank_account_number}-compact2.png?${params.toString()}`;
}

export function buildVietQrUrlForAccount(bankBin, accountNumber, accountHolder, amount, message) {
  if (!bankBin || !accountNumber) return '';
  const params = new URLSearchParams({
    amount: Math.round(amount) || '',
    addInfo: message || '',
    accountName: accountHolder || ''
  });
  return `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?${params.toString()}`;
}

export function exportRowsToExcel(rows, columns, fileName) {
  const data = rows.map(row => {
    const obj = {};
    columns.forEach(c => { obj[c.label] = typeof c.value === 'function' ? c.value(row) : row[c.key]; });
    return obj;
  });
  const ws = window.XLSX.utils.json_to_sheet(data);
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, 'Data');
  window.XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function exportRowsToPdf(rows, columns, fileName, title) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title || fileName, 14, 15);
  doc.autoTable({
    startY: 20,
    head: [columns.map(c => c.label)],
    body: rows.map(row => columns.map(c => String(typeof c.value === 'function' ? c.value(row) : (row[c.key] ?? ''))))
  });
  doc.save(`${fileName}.pdf`);
}

export function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export const DIFFICULTY_OPTIONS = [
  { value: 'de', label: 'Dễ' },
  { value: 'trung_binh', label: 'Trung bình' },
  { value: 'kho', label: 'Khó' },
  { value: 'rat_kho', label: 'Rất khó' }
];

export function difficultyLabel(value) {
  const f = DIFFICULTY_OPTIONS.find(d => d.value === value);
  return f ? f.label : value;
}

export function difficultyBadgeClass(value) {
  return { de: 'badge-easy', trung_binh: 'badge-mid', kho: 'badge-hard', rat_kho: 'badge-vhard' }[value] || 'badge-mid';
}

const VN_DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThreeDigits(num, forceHundred) {
  const tram = Math.floor(num / 100);
  const chuc = Math.floor((num % 100) / 10);
  const donvi = num % 10;
  let out = '';
  if (tram > 0) {
    out += VN_DIGITS[tram] + ' trăm';
    if (chuc === 0 && donvi > 0) out += ' linh';
  } else if (forceHundred) {
    out += 'không trăm';
    if (chuc === 0 && donvi > 0) out += ' linh';
  }
  if (chuc > 1) {
    out += ' ' + VN_DIGITS[chuc] + ' mươi';
  } else if (chuc === 1) {
    out += ' mười';
  }
  if (donvi === 1 && chuc > 1) {
    out += ' mốt';
  } else if (donvi === 5 && chuc > 0) {
    out += ' lăm';
  } else if (donvi > 0) {
    out += ' ' + VN_DIGITS[donvi];
  }
  return out.trim();
}

/** Đọc số tiền (VNĐ) thành chữ, dùng trong hợp đồng. VD: 50000000 -> "Năm mươi triệu đồng chẵn" */
export function numberToVietnameseWords(amount) {
  const num = Math.round(Number(amount) || 0);
  if (num === 0) return 'Không đồng';
  const scales = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];
  const groups = [];
  let n = Math.abs(num);
  while (n > 0) { groups.push(n % 1000); n = Math.floor(n / 1000); }
  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] === 0) continue;
    const isFirst = i === groups.length - 1;
    words += (words ? ' ' : '') + readThreeDigits(groups[i], !isFirst) + scales[i];
  }
  words = words.trim();
  const result = (num < 0 ? 'Âm ' : '') + words.charAt(0).toUpperCase() + words.slice(1) + ' đồng';
  return num % 1000 === 0 ? result + ' chẵn' : result;
}
