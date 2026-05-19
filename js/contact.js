document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('cSubmitBtn')?.addEventListener('click', send);
});

async function send() {
  const get = id => document.getElementById(id).value.trim();
  const msgEl = document.getElementById('cFormMsg');

  const data = {
    name:    get('cName'),
    phone:   get('cPhone'),
    email:   get('cEmail'),
    subject: get('cSubject'),
    message: get('cMessage')
  };

  if (!data.name)  return show(msgEl, "Введіть ваше ім'я.", 'err');
  if (!data.phone) return show(msgEl, 'Введіть номер телефону.', 'err');

  const res = await submitContact(data);
  show(msgEl, res.message, res.ok ? 'ok' : 'err');

  if (res.ok) {
    document.getElementById('contactForm').querySelectorAll('input,select,textarea')
      .forEach(el => el.value = '');
  }
}

function show(el, text, type) {
  el.textContent = text;
  el.className = `form-msg form-msg--${type}`;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
