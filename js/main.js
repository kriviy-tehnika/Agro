// main.js — Кривий Техніка

document.addEventListener('DOMContentLoaded', () => {

  const burger  = document.getElementById('burger');
  const mainnav = document.getElementById('mainnav');

  if (burger && mainnav) {
    burger.addEventListener('click', () => {
      burger.classList.toggle('open');
      mainnav.classList.toggle('open');
    });
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.cat-card, .team-card, .warranty-step, .contact-item, .admin-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity .4s ease, transform .4s ease';
    obs.observe(el);
  });

  document.addEventListener('animationend', e => {
    if (e.target.classList.contains('cat-card') || e.target.classList.contains('team-card')) {
      e.target.style.opacity = '1';
    }
  });

});

document.addEventListener('DOMContentLoaded', () => {
  const obs2 = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        obs2.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.cat-card, .team-card, .warranty-step, .contact-item').forEach(el => {
    obs2.observe(el);
  });
});

function doSearch() {
  const q = document.getElementById('siteSearch');
  if (q && q.value.trim()) {
    window.location.href = 'catalog.html?q=' + encodeURIComponent(q.value.trim());
  }
}
