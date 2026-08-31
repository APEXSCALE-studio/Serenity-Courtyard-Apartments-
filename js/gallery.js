// Lightbox for gallery grids
const items = Array.from(document.querySelectorAll('.gallery-grid .g-item img'));
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
let currentIndex = 0;

function openLightbox(i) {
  currentIndex = i;
  lightboxImg.src = items[i].src;
  lightboxImg.alt = items[i].alt;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}
function showDelta(delta) {
  currentIndex = (currentIndex + delta + items.length) % items.length;
  lightboxImg.src = items[currentIndex].src;
  lightboxImg.alt = items[currentIndex].alt;
}

items.forEach((img, i) => img.closest('.g-item').addEventListener('click', () => openLightbox(i)));
document.querySelector('.lightbox-close')?.addEventListener('click', closeLightbox);
document.querySelector('.lightbox-nav.prev')?.addEventListener('click', () => showDelta(-1));
document.querySelector('.lightbox-nav.next')?.addEventListener('click', () => showDelta(1));
lightbox?.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', (e) => {
  if (!lightbox?.classList.contains('open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') showDelta(1);
  if (e.key === 'ArrowLeft') showDelta(-1);
});

// Gallery filter tabs
document.querySelectorAll('.gallery-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gallery-filter').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.dataset.cat;
    document.querySelectorAll('.gallery-grid .g-item').forEach(el => {
      el.style.display = (cat === 'all' || el.dataset.cat === cat) ? '' : 'none';
    });
  });
});
