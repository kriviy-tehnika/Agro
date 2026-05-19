const BULKY = ['tractors','tractors_wheeled','tractors_tracked','tractors_mini','combines','combines_grain','combines_fodder','sprayers','sprayers_towed','sprayers_self','trailers','engines'];

document.addEventListener('DOMContentLoaded', () => {
  renderCheckout();
  document.getElementById('coSubmitBtn').addEventListener('click', placeOrder);
});

function renderCheckout() {
  const cart = cartGet();
  const itemsEl   = document.getElementById('checkoutItems');
  const emptyEl   = document.getElementById('checkoutEmpty');
  const totalWrap = document.getElementById('checkoutTotalWrap');
  const formEl    = document.getElementById('checkoutForm');

  if (!cart.length) {
    itemsEl.innerHTML = '';
    emptyEl.style.display = 'block';
    totalWrap.style.display = 'none';
    if (formEl) formEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  totalWrap.style.display = 'block';
  if (formEl) formEl.style.display = 'flex';

  itemsEl.innerHTML = cart.map(item => {
    const bulkyTag = BULKY.includes(item.cat)
      ? `<span style="font-size:.68rem;background:#fff3e0;color:#e65100;padding:.15rem .45rem;border-radius:3px;margin-left:.3rem">Самовивіз</span>`
      : '';
    const thumb = item.photo
      ? `<img src="${item.photo}" style="width:60px;height:50px;object-fit:cover;border-radius:4px;flex-shrink:0">`
      : `<div style="width:60px;height:50px;background:#f0f3f5;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0">📦</div>`;

    return `<div class="checkout-item">
      ${thumb}
      <div class="checkout-item__info">
        <div class="checkout-item__name">${item.name}${bulkyTag}</div>
        <div class="checkout-item__meta">${CAT_LABELS[item.cat] || ''} · ${item.price}</div>
      </div>
      <div class="checkout-item__qty">
        <button class="qty-btn" onclick="coQty(${item.id}, ${(item.qty||1)-1})">-</button>
        <span class="qty-val">${item.qty||1}</span>
        <button class="qty-btn" onclick="coQty(${item.id}, ${(item.qty||1)+1})">+</button>
      </div>
      <button class="cart-item__del" onclick="coDel(${item.id})">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    </div>`;
  }).join('');

  const count = cart.reduce((s, c) => s + (c.qty||1), 0);
  document.getElementById('checkoutCount').textContent = count + ' шт.';

  const total = cart.reduce((s, c) => {
    const n = parseFloat((c.price||'').replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    return s + n * (c.qty||1);
  }, 0);
  document.getElementById('checkoutTotal').textContent =
    total > 0 ? total.toLocaleString('uk-UA') + ' грн' : 'Уточнюється';

  updateDelivery();
}

function coQty(id, qty) { cartSetQty(id, qty); renderCheckout(); }
function coDel(id)       { cartRemove(id);      renderCheckout(); }

function updateDelivery() {
  const sel  = document.getElementById('coDelivery');
  const note = document.getElementById('deliveryNote');
  const hasBulky = cartGet().some(c => BULKY.includes(c.cat));

  if (hasBulky) {
    sel.innerHTML = `<option value="pickup"> Самовивіз (єдиний варіант для техніки)</option>`;
    sel.disabled = true;
    note.style.display = 'flex';
    note.textContent = '⚠ Габаритна техніка видається тільки самовивозом з нашого складу.';
  } else {
    sel.disabled = false;
    sel.innerHTML = `
      <option value="pickup"> Самовивіз</option>
      <option value="nova"> Нова Пошта</option>
      <option value="courier"> Кур'єр</option>
      <option value="transport"> Транспортна компанія</option>`;
    note.style.display = 'none';
  }
}

async function placeOrder() {
  const get = id => document.getElementById(id)?.value.trim();
  const msgEl = document.getElementById('checkoutMsg');

  if (!get('coName'))  return show(msgEl, "Введіть ваше ім'я.", 'err');
  if (!get('coPhone')) return show(msgEl, 'Введіть телефон.', 'err');

  const cart = cartGet();
  if (!cart.length)    return show(msgEl, 'Кошик порожній.', 'err');

  const res = await submitOrder({
    name:     get('coName'),
    phone:    get('coPhone'),
    email:    get('coEmail'),
    delivery: get('coDelivery'),
    payment:  get('coPayment'),
    comment:  get('coComment'),
    items:    cart.map(c => ({
      id:          c.id,
      name:        c.name,
      cat:         c.cat,
      price:       c.price,
      price_value: parseFloat((c.price||'').replace(/[^\d.,]/g,'').replace(',','.')) || null,
      qty:         c.qty || 1,
      is_bulky:    c.is_bulky || 0
    }))
  });

  if (!res.ok) return show(msgEl, res.message || 'Помилка.', 'err');

  cartClear();
  document.getElementById('checkoutForm').style.display = 'none';
  document.getElementById('checkoutTotalWrap').style.display = 'none';
  const ok = document.getElementById('checkoutSuccess');
  ok.style.display = 'block';
  document.getElementById('successText').textContent =
    `${get('coName')}, замовлення №${res.id} прийнято! Зателефонуємо на ${get('coPhone')}.`;
}

function show(el, text, type) {
  el.textContent = text;
  el.className = `form-msg form-msg--${type}`;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
