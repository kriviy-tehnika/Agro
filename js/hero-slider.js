// hero-slider.js
document.addEventListener('DOMContentLoaded', () => {
  const slides = document.querySelectorAll('.hero__slide');
  const dots   = document.querySelectorAll('.hero__dot');
  let current  = 0;
  let timer;

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(next, 5000);
  }

  document.getElementById('heroNext')?.addEventListener('click', () => { next(); startTimer(); });
  document.getElementById('heroPrev')?.addEventListener('click', () => { prev(); startTimer(); });

  dots.forEach(dot => {
    dot.addEventListener('click', () => { goTo(+dot.dataset.idx); startTimer(); });
  });

  startTimer();
});
