document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('wSubmitBtn').addEventListener('click', send);
});

async function send() {
  const get = id => document.getElementById(id).value.trim();
  const msgEl = document.getElementById('wFormMsg');

  const data = {
    name:     get('wName'),
    phone:    get('wPhone'),
    email:    get('wEmail'),
    machine:  get('wMachine'),
    serial:   get('wSerial'),
    date:     get('wDate'),
    type:     get('wType'),
    desc:     get('wDesc'),
    location: get('wLocation')
  };

  if (!data.name)    return show(msgEl, "Введіть ваше ім'я.", 'err');
  if (!data.phone)   return show(msgEl, 'Введіть номер телефону.', 'err');
  if (!data.machine) return show(msgEl, 'Вкажіть техніку.', 'err');
  if (!data.desc)    return show(msgEl, 'Опишіть несправність.', 'err');

  const res = await submitWarranty(data);

  if (res.ok) {
    show(msgEl, res.message, 'ok');
    document.getElementById('warrantyForm').querySelectorAll('input,select,textarea')
      .forEach(el => el.value = '');
  } else {
    show(msgEl, res.message || 'Помилка. Спробуйте ще раз.', 'err');
  }
}

function show(el, text, type) {
  el.textContent = text;
  el.className = `form-msg form-msg--${type}`;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
