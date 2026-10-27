// Huy hiệu tick dùng chung (SVG nội tuyến). Trả về chuỗi HTML an toàn (nội dung tĩnh, id được escape).
import { esc } from '../search-util.js';

export const BADGE_TEXT = {
  unverified: 'Chưa xác thực',
  low: 'Đã xác thực từ xa',
  high: 'Đã xác thực thực tế',
  suspect: 'Nghi ngờ',
};

const ICONS = {
  unverified: '<circle cx="14" cy="14" r="12" fill="#eef1f4" stroke="#6b7785" stroke-width="2"/><path d="M9 14h10" stroke="#6b7785" stroke-width="2.4" stroke-linecap="round"/>',
  low: '<circle cx="14" cy="14" r="13" fill="#7fb8ee"/><path d="M8.5 14.5l3.8 3.8 7.2-7.6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  high: '<circle cx="14" cy="14" r="13" fill="#07406e"/><path d="M6.5 14.5l3.6 3.6 6.4-6.8M12.5 17.6l1.2 1.2 7.3-7.8" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/>',
  suspect: '<path d="M14 2.5L26.5 25H1.5z" fill="#d9730d" stroke="#d9730d" stroke-width="2" stroke-linejoin="round"/><path d="M14 10v7" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="14" cy="20.5" r="1.6" fill="#fff"/>',
};

export function badgeSvg(status, size = 28) {
  const s = ICONS[status] ? status : 'unverified';
  return `<svg class="vb-svg" width="${Number(size) || 28}" height="${Number(size) || 28}" viewBox="0 0 28 28" aria-hidden="true" focusable="false">${ICONS[s]}</svg>`;
}

// Huy hiệu bấm được, dẫn tới báo cáo #/tra-cuu/<id>.
export function badgeLink(status, id, { label = true } = {}) {
  const s = ICONS[status] ? status : 'unverified';
  const text = BADGE_TEXT[s];
  return `<a class="vbadge vb-${s}" href="#/tra-cuu/${encodeURIComponent(id)}" aria-label="${esc(text)} – xem báo cáo" title="Bấm để xem báo cáo">${badgeSvg(s)}${label ? `<span>${esc(text)}</span>` : ''}</a>`;
}
