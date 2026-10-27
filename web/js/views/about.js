// Màn "Giới thiệu demo" – placeholder, sẽ được hoàn thiện ở task sau.
export function render(container, params = []) {
  const h = document.createElement('h1');
  h.textContent = 'Giới thiệu demo';
  const p = document.createElement('p');
  p.textContent = 'Nội dung sẽ được bổ sung.';
  container.append(h, p);
}
