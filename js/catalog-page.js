// catalog-page.js

let allProducts  = [];
let filtered     = [];
let activeCat    = '';
let activeMakers = new Set();

// ── Init ──────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadCategories(), loadMakers(), loadProducts()]);
  bindSearchInput();
  bindPriceInputs();
});

async function loadProducts() {
  allProducts = await fetchProducts();
  filtered    = [...allProducts];
  renderGrid(filtered);
}

// ── Categories ───────────────────────────────

async function loadCategories() {
  const tree = await apiGet('/api/categories');
  const wrap = document.getElementById('catTree');
  if (!wrap) return;

  // "Всі" button
  let html = `<div class="cat-node">
    <button class="cat-node__btn active" data-slug="" onclick="selectCat(this, '')">
      <span class="cat-node__label">Всі категорії</span>
    </button>
  </div>`;

  for (const cat of tree) {
    const hasChildren = cat.children && cat.children.length > 0;
    const chevron = hasChildren
      ? `<svg class="cat-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>`
      : '';

    html += `<div class="cat-node">
      <button class="cat-node__btn" data-slug="${cat.slug}" onclick="selectCat(this, '${cat.slug}')">
        <span class="cat-node__label">${cat.name_uk}</span>
        ${chevron}
      </button>`;

    if (hasChildren) {
      html += `<div class="cat-children" id="children-${cat.slug}">`;
      for (const sub of cat.children) {
        html += `<button class="cat-child-btn" data-slug="${sub.slug}" onclick="selectSubCat(this, '${sub.slug}')">
          ${sub.name_uk}
        </button>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
  }

  wrap.innerHTML = html;
}

function selectCat(btn, slug) {
  // Deactivate all
  document.querySelectorAll('.cat-node__btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.cat-child-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Toggle children
  const childrenId = `children-${slug}`;
  const children   = document.getElementById(childrenId);
  const chevron    = btn.querySelector('.cat-chevron');

  // Close all others first
  document.querySelectorAll('.cat-children').forEach(c => {
    c.classList.remove('open');
    const ch = c.previousElementSibling?.querySelector('.cat-chevron');
    if (ch) ch.classList.remove('open');
  });

  if (children) {
    children.classList.add('open');
    if (chevron) chevron.classList.add('open');
  }

  activeCat = slug;
  applyFilters();
}

function selectSubCat(btn, slug) {
  document.querySelectorAll('.cat-node__btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.cat-child-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeCat = slug;
  applyFilters();
}

// ── Makers ───────────────────────────────────

async function loadMakers() {
  const makers = await apiGet('/api/makers');
  const wrap   = document.getElementById('makerList');
  if (!wrap || !makers.length) {
    if (wrap) wrap.innerHTML = '<span style="font-size:.82rem;color:#aaa">Немає виробників</span>';
    return;
  }

  wrap.innerHTML = makers.map(m => `
    <label class="sidebar-check">
      <input type="checkbox" value="${m.name}" onchange="toggleMaker('${m.name}', this.checked)">
      ${m.name}
    </label>`).join('');
}

function toggleMaker(name, checked) {
  checked ? activeMakers.add(name) : activeMakers.delete(name);
  applyFilters();
}

// ── Search ───────────────────────────────────

function bindSearchInput() {
  const input = document.getElementById('filterSearch');
  if (!input) return;
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(applyFilters, 350);
  });
}

function bindPriceInputs() {
  ['priceMin','priceMax'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    let timer;
    el.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(applyFilters, 400);
    });
  });
}

// ── Filters ──────────────────────────────────

function applyFilters() {
  const text     = (document.getElementById('filterSearch')?.value || '').toLowerCase().trim();
  const priceMin = parseFloat(document.getElementById('priceMin')?.value) || 0;
  const priceMax = parseFloat(document.getElementById('priceMax')?.value) || Infinity;
  const status   = document.querySelector('input[name="status"]:checked')?.value || '';

  filtered = allProducts.filter(p => {
    if (activeCat && p.cat !== activeCat) return false;

    if (text && !p.name.toLowerCase().includes(text) &&
        !(p.desc || '').toLowerCase().includes(text) &&
        !(p.maker || '').toLowerCase().includes(text)) return false;

    if (activeMakers.size && !activeMakers.has(p.maker)) return false;

    if (p.price_num) {
      if (priceMin > 0 && p.price_num < priceMin) return false;
      if (priceMax < Infinity && p.price_num > priceMax) return false;
    }

    if (status && p.status !== status) return false;

    return true;
  });

  sortProducts();
  updateActiveFilterTags();
  updateFilterCount();
}

function resetFilters() {
  activeCat = '';
  activeMakers.clear();

  document.getElementById('filterSearch').value = '';
  document.getElementById('priceMin').value     = '';
  document.getElementById('priceMax').value     = '';
  document.querySelector('input[name="status"][value=""]').checked = true;
  document.querySelectorAll('.maker-list input[type=checkbox]').forEach(cb => cb.checked = false);
  document.querySelectorAll('.cat-node__btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.cat-child-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.cat-children').forEach(c => c.classList.remove('open'));
  document.querySelector('.cat-node__btn[data-slug=""]')?.classList.add('active');

  filtered = [...allProducts];
  renderGrid(filtered);
  updateActiveFilterTags();
  updateFilterCount();
}

// ── Sort ─────────────────────────────────────

function sortProducts() {
  const val = document.getElementById('sortSelect')?.value || 'default';
  const arr = [...filtered];

  if (val === 'price_asc')  arr.sort((a,b) => (a.price_num||999999999) - (b.price_num||999999999));
  if (val === 'price_desc') arr.sort((a,b) => (b.price_num||0) - (a.price_num||0));
  if (val === 'name_asc')   arr.sort((a,b) => a.name.localeCompare(b.name, 'uk'));

  renderGrid(arr);
}

// ── Render ───────────────────────────────────

function renderGrid(items) {
  const grid  = document.getElementById('catalogGrid');
  const empty = document.getElementById('catalogEmpty');
  const info  = document.getElementById('catalogResults');

  if (!items.length) {
    grid.innerHTML    = '';
    empty.style.display = 'flex';
    info.textContent  = 'Нічого не знайдено';
    return;
  }

  empty.style.display = 'none';
  info.textContent    = `Знайдено: ${items.length} ${plural(items.length)}`;
  grid.innerHTML      = items.map(p => buildCard(p)).join('');
}

function plural(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'позиція';
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'позиції';
  return 'позицій';
}

// ── Active filter tags ────────────────────────

function updateActiveFilterTags() {
  const wrap = document.getElementById('activeFilters');
  if (!wrap) return;

  const tags = [];

  if (activeCat) {
    const btn = document.querySelector(`[data-slug="${activeCat}"]`);
    const label = btn?.textContent?.trim() || activeCat;
    tags.push({ label: `Категорія: ${label}`, clear: () => { activeCat = ''; applyFilters(); document.querySelector('.cat-node__btn[data-slug=""]')?.classList.add('active'); } });
  }

  activeMakers.forEach(m => {
    tags.push({ label: `Виробник: ${m}`, clear: () => {
      activeMakers.delete(m);
      document.querySelector(`.maker-list input[value="${m}"]`).checked = false;
      applyFilters();
    }});
  });

  const text = document.getElementById('filterSearch')?.value.trim();
  if (text) {
    tags.push({ label: `Пошук: "${text}"`, clear: () => {
      document.getElementById('filterSearch').value = '';
      applyFilters();
    }});
  }

  const status = document.querySelector('input[name="status"]:checked')?.value;
  if (status) {
    const labels = { available: 'В наявності', order: 'Під замовлення' };
    tags.push({ label: labels[status], clear: () => {
      document.querySelector('input[name="status"][value=""]').checked = true;
      applyFilters();
    }});
  }

  wrap.innerHTML = tags.map((t, i) => `
    <span class="filter-tag">
      ${t.label}
      <button class="filter-tag__remove" onclick="clearTag(${i})">×</button>
    </span>`).join('');

  // Store clear functions
  wrap._clearFns = tags.map(t => t.clear);
}

function clearTag(i) {
  const wrap = document.getElementById('activeFilters');
  if (wrap._clearFns && wrap._clearFns[i]) wrap._clearFns[i]();
}

function updateFilterCount() {
  const cnt = document.getElementById('filterCount');
  if (!cnt) return;
  let count = 0;
  if (activeCat) count++;
  count += activeMakers.size;
  if (document.getElementById('filterSearch')?.value.trim()) count++;
  if (document.querySelector('input[name="status"]:checked')?.value) count++;
  cnt.textContent    = count;
  cnt.style.display  = count > 0 ? 'flex' : 'none';
}

// ── Mobile sidebar ────────────────────────────

function openSidebar() {
  document.getElementById('catalogSidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  document.getElementById('catalogSidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function doSearch() {
  const val = document.getElementById('siteSearch')?.value.trim();
  if (val) {
    document.getElementById('filterSearch').value = val;
    applyFilters();
  }
}
