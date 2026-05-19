let adminReady = false;

function initAdmin() {
  if (adminReady) { load(); return; }
  adminReady = true;

  load();

  document.getElementById('adminAddBtn').addEventListener('click', addItem);

  document.getElementById('clearAllBtn').addEventListener('click', () => {
    if (!confirm('Видалити всі товари з каталогу?')) return;
    document.querySelectorAll('.admin-item').forEach(el => {
      const id = +el.dataset.id;
      if (id) deleteProduct(id);
    });
    setTimeout(load, 300);
  });

  const photoInput = document.getElementById('aPhoto');
  if (photoInput) photoInput.addEventListener('change', previewPhoto);
}

document.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('kt_admin_auth') === '1') {
    initAdmin();
  }
});

let photoBase64 = '';

function previewPhoto() {
  const file = this.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    alert('Файл занадто великий. Максимум 2 МБ.');
    this.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    photoBase64 = e.target.result;
    const prev = document.getElementById('aPhotoPreview');
    if (prev) { prev.src = photoBase64; prev.style.display = 'block'; }
  };
  reader.readAsDataURL(file);
}

async function load() {
  const items = await fetchProducts();
  renderItems(items);
  renderWarranty();
  renderContacts();
}

async function addItem() {
  const get = id => document.getElementById(id)?.value.trim();
  const msg = document.getElementById('adminFormMsg');

  const name = get('aName');
  const cat  = get('aCat');

  if (!name) return flash(msg, 'Введіть назву техніки.', 'err');
  if (!cat)  return flash(msg, 'Оберіть категорію.', 'err');

  const res = await addProduct({
    name,
    cat,
    desc:   get('aDesc') || 'Деталі уточнюйте у менеджера.',
    price:  get('aPrice') || 'За запитом',
    status: get('aStatus') || 'available',
    photo:  photoBase64
  });

  if (!res.ok) return flash(msg, res.message || 'Помилка.', 'err');

  flash(msg, ` "${name}" додано!`, 'ok');
  ['aName','aCat','aDesc','aPrice'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const prev = document.getElementById('aPhotoPreview');
  if (prev) { prev.src = ''; prev.style.display = 'none'; }
  photoBase64 = '';

  load();
}

function renderItems(items) {
  const wrap  = document.getElementById('adminItems');
  const empty = document.getElementById('adminEmpty');

  if (!items.length) {
    wrap.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  wrap.innerHTML = items.map(item => {
    const thumb = item.photo
      ? `<img src="${item.photo}" style="width:64px;height:52px;object-fit:cover;border-radius:4px;flex-shrink:0">`
      : `<div style="width:64px;height:52px;background:#f0f0f0;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
           <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="1.5">
             <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
             <path d="m21 15-5-5L5 21"/>
           </svg>
         </div>`;

    return `<div class="admin-item" id="ai-${item.id}" data-id="${item.id}">
      ${thumb}
      <div class="admin-item__info" style="flex:1;min-width:0">
        <div class="admin-item__name">${item.name}</div>
        <div class="admin-item__meta">${CAT_LABELS[item.cat] || item.cat}</div>
        <div class="admin-inline-edit">
          <label>Ціна:</label>
          <input class="admin-price-input" id="price-${item.id}" value="${item.price || 'За запитом'}">
        </div>
        <div class="admin-inline-edit">
          <label>Статус:</label>
          <select class="admin-status-select" id="status-${item.id}" onchange="save(${item.id})">
            <option value="available" ${item.status==='available'?'selected':''}> В наявності</option>
            <option value="order"     ${item.status==='order'    ?'selected':''}> Під замовлення</option>
            <option value="sold"      ${item.status==='sold'     ?'selected':''}> Продано</option>
          </select
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:.4rem;flex-shrink:0">
        <button class="btn btn--primary btn--sm" onclick="save(${item.id})"> Зберегти</button>
        <button class="admin-item__del" onclick="del(${item.id})">🗑 Видалити</button>
      </div>
    </div>`;
  }).join('');

  document.querySelectorAll('.admin-price-input').forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') save(+inp.id.replace('price-', ''));
    });
  });
}

async function save(id) {
  const price  = document.getElementById(`price-${id}`)?.value.trim();
  const status = document.getElementById(`status-${id}`)?.value;

  await patchProduct(id, { price, status });

  const row = document.getElementById(`ai-${id}`);
  if (row) {
    row.style.transition = 'background .15s';
    row.style.background = '#e8f5e9';
    setTimeout(() => row.style.background = '', 900);
  }
}

async function del(id) {
  if (!confirm('Видалити цю позицію?')) return;
  await deleteProduct(id);
  load();
}

async function renderWarranty() {
  const wrap  = document.getElementById('warrantyItems');
  const empty = document.getElementById('warrantyEmpty');
  const cnt   = document.getElementById('warrantyCount');

  const items = await apiGet('/api/warranty');
  cnt.textContent = `Всього: ${items.length}`;

  if (!items.length) {
    wrap.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  wrap.innerHTML = items.map(w => `
    <div class="admin-item">
      <div class="admin-item__icon">🛠</div>
      <div class="admin-item__info">
        <div class="admin-item__name">${w.contact_name} · ${w.machine_name}</div>
        <div class="admin-item__meta">${w.contact_phone} · ${w.created_at}</div>
        <div class="admin-item__meta" style="margin-top:.2rem;white-space:pre-line">${w.fault_description || ''}</div>
      </div>
      <span style="font-size:.75rem;padding:.3rem .6rem;border-radius:3px;
        background:${w.status==='new'?'#fff3e0':'#e8f5e9'};
        color:${w.status==='new'?'#e65100':'#2e7d32'}">
        ${w.status==='new'?'Нова':'Опрацьована'}
      </span>
    </div>`).join('');
}

async function renderContacts() {
  const wrap  = document.getElementById('contactItems');
  const empty = document.getElementById('contactEmpty');

  const items = await apiGet('/api/contact');

  if (!items.length) {
    wrap.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  wrap.innerHTML = items.map(c => `
    <div class="admin-item">
      <div class="admin-item__icon">📬</div>
      <div class="admin-item__info">
        <div class="admin-item__name">${c.contact_name} · ${c.subject || 'Запит'}</div>
        <div class="admin-item__meta">${c.contact_phone}${c.contact_email?' · '+c.contact_email:''} · ${c.created_at}</div>
        <div class="admin-item__meta" style="margin-top:.2rem;white-space:pre-line">${c.message || ''}</div>
      </div>
    </div>`).join('');
}

function flash(el, text, type) {
  el.textContent = text;
  el.className = `form-msg form-msg--${type}`;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4000);
}
