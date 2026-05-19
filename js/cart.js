// cart.js — Кошик (slideout sidebar + checkout)

function renderCartSidebar() {
  const cart    = cartGet();
  const body    = document.getElementById('cartBody');
  const footer  = document.getElementById('cartFooter');
  const emptyEl = document.getElementById('cartEmpty');
  if (!body) return;

  cartUpdateBadge();

  if (cart.length === 0) {
    body.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'flex';
    if (footer)  footer.style.display  = 'none';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  if (footer)  footer.style.display  = 'block';

  body.innerHTML = cart.map(item => {
    const thumb = item.photo
      ? '<img src="' + item.photo + '" style="width:56px;height:48px;object-fit:cover;border-radius:4px;flex-shrink:0;" />'
      : '<div style="width:56px;height:48px;background:#F0F3F5;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#CCC" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';
    return '<div class="cart-item">'
      + thumb
      + '<div class="cart-item__info">'
      + '<div class="cart-item__name">' + item.name + '</div>'
      + '<div class="cart-item__price">' + item.price + '</div>'
      + '<div class="cart-item__qty">'
      + '<button class="qty-btn" onclick="cartSetQty(' + item.id + ',' + ((item.qty||1)-1) + ')">-</button>'
      + '<span class="qty-val">' + (item.qty||1) + '</span>'
      + '<button class="qty-btn" onclick="cartSetQty(' + item.id + ',' + ((item.qty||1)+1) + ')">+</button>'
      + '</div></div>'
      + '<button class="cart-item__del" onclick="cartRemove(' + item.id + ')" title="Видалити">'
      + '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>'
      + '</button></div>';
  }).join('');

  const totalEl = document.getElementById('cartTotal');
  if (totalEl) {
    const numericItems = cart.filter(c => /\d/.test(c.price||''));
    if (numericItems.length > 0) {
      const total = cart.reduce((s, c) => {
        const num = parseFloat((c.price||'0').replace(/[^\d.,]/g,'').replace(',','.')) || 0;
        return s + num * (c.qty||1);
      }, 0);
      totalEl.textContent = total > 0 ? total.toLocaleString('uk-UA') + ' грн' : 'За запитом';
    } else {
      totalEl.textContent = 'За запитом';
    }
  }
}

function openCart() {
  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  renderCartSidebar();
}

function closeCart() {
  const sidebar = document.getElementById('cartSidebar');
  const overlay = document.getElementById('cartOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function goCheckout() {
  const cart = cartGet();
  if (cart.length === 0) { alert('Кошик порожній!'); return; }
  closeCart();
  window.location.href = 'checkout.html';
}

document.addEventListener('DOMContentLoaded', () => {
  cartUpdateBadge();
  renderCartSidebar();
  const overlay = document.getElementById('cartOverlay');
  if (overlay) overlay.addEventListener('click', closeCart);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });
});
