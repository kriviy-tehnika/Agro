document.addEventListener('DOMContentLoaded', async () => {
  const wrap = document.getElementById('catPreview');
  if (!wrap) return;

  const items = await fetchProducts();
  wrap.innerHTML = items.slice(0, 4).map(i => buildCard(i)).join('');
});
