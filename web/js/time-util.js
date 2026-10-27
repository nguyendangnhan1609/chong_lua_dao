// Định dạng ngày/giờ dùng chung cho nhật ký: giờ địa phương, dạng "AAAA-TT-NN HH:MM".
const pad = (n) => String(n).padStart(2, '0');
export function stamp(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
export const dateOnly = (now = new Date()) => stamp(now).slice(0, 10);
