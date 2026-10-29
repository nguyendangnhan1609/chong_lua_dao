// Hash-routing: mỗi route là một module render riêng trong views/.
import * as search from './views/search.js';
import * as business from './views/business.js';
import * as admin from './views/admin.js';
import * as showcase from './views/showcase.js';
import * as about from './views/about.js';
import * as tickCheck from './views/tick-check.js';
import { stopLiveBadges } from './components/live-badge.js';

export const DEFAULT_ROUTE = 'tra-cuu';
export const routes = {
  'tra-cuu': search,
  'doanh-nghiep': business,
  'quan-tri': admin,
  'mau': showcase,
  'kiem-tra-tick': tickCheck,
  'gioi-thieu': about,
};

function safeDecode(s) {
  try { return decodeURIComponent(s); } catch { return s; }
}

export function parseHash(hash) {
  const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  const name = parts[0] && routes[parts[0]] ? parts[0] : DEFAULT_ROUTE;
  return { name, params: parts.slice(1).map(safeDecode) };
}

export function startRouter(container) {
  function render() {
    const { name, params } = parseHash(location.hash);
    document.querySelectorAll('[data-route]').forEach((a) => {
      const on = a.dataset.route === (name === 'kiem-tra-tick' ? 'tra-cuu' : name); // công cụ thuộc góc nhìn Người dùng
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    stopLiveBadges();
    container.replaceChildren();
    routes[name].render(container, params);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);
  if (!location.hash) location.replace('#/' + DEFAULT_ROUTE);
  render();
}
