const CAT_LABELS = {
  tractors:        'Трактор',
  tractors_wheeled:'Колісний трактор',
  tractors_tracked:'Гусеничний трактор',
  tractors_mini:   'Міні-трактор',
  combines:        'Комбайн',
  combines_grain:  'Зернозбиральний',
  combines_fodder: 'Кормозбиральний',
  sprayers:        'Обприскувач',
  sprayers_towed:  'Причіпний обприскувач',
  sprayers_self:   'Самохідний обприскувач',
  plows:           'Плуги та культиватори',
  plows_disk:      'Дисковий плуг',
  plows_mouldboard:'Лемішний плуг',
  cultivators:     'Культиватор',
  harrows:         'Борона',
  trailers:        'Причіп',
  irrigation:      'Зрошення та насоси',
  drip:            'Краплинне зрошення',
  pumps:           'Насос',
  engines:         'Двигун та агрегати',
  parts:           'Запчастини',
  parts_engine:    'Запч. двигуна',
  parts_hydraulics:'Гідравліка',
  parts_electric:  'Електрика',
  parts_body:      'Кузовні деталі',
  other:           'Інше'
};

const STATUS_LABELS = {
  available: 'В наявності',
  order:     'Під замовлення',
  sold:      'Продано'
};

const STATUS_COLORS = {
  available: '#2e7d32',
  order:     '#B8860B',
  sold:      '#aaa'
};


//  API-запити 

async function apiGet(url) {
  return API.get(url);
}

async function apiPost(url, data) {
  return API.post(url, data);
}

async function apiPatch(url, data) {
  return API.patch(url, data);
}

async function apiDelete(url) {
  return API.delete(url);
}


// --------------- каталог ---------------

async function fetchProducts(cat) {
  const url = cat ? `/api/products?cat=${cat}` : '/api/products';
  return apiGet(url);
}

async function addProduct(data) {
  return apiPost('/api/products', data);
}

async function deleteProduct(id) {
  return apiDelete(`/api/products/${id}`);
}

async function patchProduct(id, data) {
  return apiPatch(`/api/products/${id}`, data);
}


// --------------- кошик (лишається в localStorage — це нормально) ---------------

const CART_KEY = 'kt_cart';

function cartGet() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
  catch { return []; }
}

function cartSave(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function cartAdd(item) {
  const cart = cartGet();
  const existing = cart.find(c => c.id === item.id);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart.push({ ...item, qty: 1 });
  }
  cartSave(cart);
  cartUpdateBadge();
  cartFlash(item.name);
  if (typeof renderCartSidebar === 'function') renderCartSidebar();
}

function cartRemove(id) {
  cartSave(cartGet().filter(c => c.id !== id));
  cartUpdateBadge();
  if (typeof renderCartSidebar === 'function') renderCartSidebar();
}

function cartSetQty(id, qty) {
  if (qty < 1) { cartRemove(id); return; }
  const cart = cartGet();
  const item = cart.find(c => c.id === id);
  if (item) item.qty = qty;
  cartSave(cart);
  if (typeof renderCartSidebar === 'function') renderCartSidebar();
}

function cartClear() {
  cartSave([]);
  cartUpdateBadge();
  if (typeof renderCartSidebar === 'function') renderCartSidebar();
}

function cartCount() {
  return cartGet().reduce((sum, c) => sum + (c.qty || 1), 0);
}

function cartUpdateBadge() {
  const cnt = cartCount();
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.textContent = cnt;
    b.style.display = cnt > 0 ? 'flex' : 'none';
  });
}

function cartFlash(name) {
  const toast = document.getElementById('cartToast');
  if (!toast) return;
  toast.textContent = `✓ "${name}" додано до кошика`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}


// --------------- форми ---------------

async function submitWarranty(data) {
  return apiPost('/api/warranty', data);
}

async function submitContact(data) {
  return apiPost('/api/contact', data);
}

async function submitOrder(data) {
  return apiPost('/api/orders', data);
}


// --------------- картка товару ---------------

function buildCard(item, showLink = true) {
  const label = CAT_LABELS[item.cat] || item.cat;
  const isSold = item.status === 'sold';
  const statusColor = STATUS_COLORS[item.status] || '#888';

  const statusHtml = item.status
    ? `<span class="cat-card__status" style="color:${statusColor}">${STATUS_LABELS[item.status] || ''}</span>`
    : '';

  const thumbHtml = item.photo
    ? `<img src="${item.photo}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;display:block;">`
    : `<div class="cat-card__no-photo">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#CCC" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="m21 15-5-5L5 21"/>
        </svg>
        <span>Фото відсутнє</span>
      </div>`;

  let btn = '';
  if (showLink) {
    if (isSold) {
      btn = `<span class="btn btn--sm" style="background:#eee;color:#999;cursor:default;border:1px solid #eee">Продано</span>`;
    } else {
      const safeItem = JSON.stringify({
        id: item.id, name: item.name, cat: item.cat,
        price: item.price, photo: (item.photo || '').slice(0, 200),
        is_bulky: item.is_bulky || 0
      }).replace(/'/g, "\\'");
      btn = `<button class="btn btn--cart btn--sm" onclick='cartAdd(${safeItem})'>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
        </svg>
        В кошик
      </button>`;
    }
  }

  return `
    <div class="cat-card" data-cat="${item.cat}">
      <div class="cat-card__thumb">
        <span class="cat-card__cat">${label}</span>
        ${thumbHtml}
      </div>
      <div class="cat-card__body">
        <div class="cat-card__name">${item.name}</div>
        <div class="cat-card__desc">${item.desc || ''}</div>
        <div class="cat-card__footer">
          <div>
            <span class="cat-card__price">${item.price || 'За запитом'}</span>
            ${statusHtml}
          </div>
          ${btn}
        </div>
      </div>
    </div>`;
}
