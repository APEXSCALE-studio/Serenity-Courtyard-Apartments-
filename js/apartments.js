import { supabase } from './supabase-config.js';
import { showToast } from './main.js';

const grid = document.getElementById('apartmentsGrid');
const searchForm = document.getElementById('apartmentSearch');
let ALL_APARTMENTS = [];

const FALLBACK_IMAGES = {
  studio: 'images/apartment-bedroom-simple.jpg',
  'one-bedroom': 'images/apartment-dining.jpg',
  deluxe: 'images/apartment-bedroom-modern.jpg',
  executive: 'images/apartment-kitchen.jpg',
  family: 'images/apartment-bedroom-modern.jpg',
};

function availabilityLabel(apt) {
  if (!apt.available) return { cls: 'full', text: 'Fully booked' };
  return { cls: 'available', text: 'Available' };
}

function renderApartments(list) {
  if (!grid) return;
  if (!list.length) {
    grid.innerHTML = `<p class="center" style="grid-column:1/-1;color:#8a8474;padding:40px 0;">No apartments match your search — try widening your dates or guest count.</p>`;
    return;
  }
  grid.innerHTML = list.map(apt => {
    const avail = availabilityLabel(apt);
    const img = (apt.images && apt.images[0]) || FALLBACK_IMAGES[apt.id] || FALLBACK_IMAGES.studio;
    const features = (apt.features || []).slice(0, 4).map(f => `<span>${f}</span>`).join('');
    return `
    <article class="apt-card reveal in" data-id="${apt.id}">
      <div class="apt-media">
        <img src="${img}" alt="${apt.name} at Serenity Courtyard Apartments" loading="lazy">
        <span class="apt-avail ${avail.cls}">${avail.text}</span>
      </div>
      <div class="apt-body">
        <h3>${apt.name}</h3>
        <p class="apt-tagline">${apt.tagline || ''}</p>
        <p class="apt-desc">${apt.description || ''}</p>
        <div class="apt-meta">
          <span>${apt.capacity_adults} adults${apt.capacity_children ? ' · ' + apt.capacity_children + ' children' : ''}</span>
          <span>${apt.bedrooms} bedroom${apt.bedrooms === 1 ? '' : apt.bedrooms === 0 ? 's (studio)' : 's'}</span>
        </div>
        <div class="apt-features">${features}</div>
        <div class="apt-foot">
          <div class="apt-price">K${Number(apt.price_per_night).toLocaleString()} <span>/ night</span></div>
          <button class="btn btn-primary book-btn" data-id="${apt.id}" ${!apt.available ? 'disabled' : ''}>
            ${apt.available ? 'Book Now' : 'Unavailable'}
          </button>
        </div>
      </div>
    </article>`;
  }).join('');

  grid.querySelectorAll('.book-btn').forEach(btn => {
    btn.addEventListener('click', () => openBookingModal(btn.dataset.id));
  });
}

async function loadApartments() {
  if (!grid) return;
  grid.innerHTML = `<p class="center" style="grid-column:1/-1;color:#8a8474;padding:40px 0;">Loading apartments…</p>`;
  const { data, error } = await supabase
    .from('apartments')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    const isNetworkError = error.message?.toLowerCase().includes('fetch');
    grid.innerHTML = `<p class="center" style="grid-column:1/-1;color:#8a3b30;padding:40px 0;">${
      isNetworkError
        ? "Can't reach the booking server from this preview — this environment likely has no internet access. Try the live deployed URL instead."
        : "Couldn't load apartments right now. Please refresh or contact us directly."
    }</p>`;
    console.error(error);
    return;
  }
  ALL_APARTMENTS = data || [];
  renderApartments(ALL_APARTMENTS);
}

// ---- Search / filter ----
if (searchForm) {
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const guests = Number(searchForm.guests.value || 0);
    const type = searchForm.type.value;
    let filtered = ALL_APARTMENTS;
    if (guests) filtered = filtered.filter(a => a.capacity_adults >= guests);
    if (type) filtered = filtered.filter(a => a.id === type);
    renderApartments(filtered);
    document.getElementById('apartmentsGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

// ---- Booking modal ----
const modal = document.getElementById('bookingModal');
const bookingForm = document.getElementById('bookingForm');
const modalTitle = document.getElementById('modalApartmentName');
const statusMsg = document.getElementById('bookingStatus');
let currentApartment = null;

function openBookingModal(apartmentId) {
  currentApartment = ALL_APARTMENTS.find(a => a.id === apartmentId);
  if (!currentApartment || !modal) return;
  modalTitle.textContent = `Book — ${currentApartment.name}`;
  bookingForm.reset();
  bookingForm.classList.remove('hidden');
  document.getElementById('bookingConfirmation')?.classList.remove('show');
  statusMsg.className = 'status-msg';
  statusMsg.textContent = '';
  const today = new Date().toISOString().split('T')[0];
  bookingForm.checkin.min = today;
  bookingForm.checkout.min = today;
  bookingForm.guests.max = currentApartment.capacity_adults;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeBookingModal() {
  modal?.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('modalCloseBtn')?.addEventListener('click', closeBookingModal);
modal?.addEventListener('click', (e) => { if (e.target === modal) closeBookingModal(); });

function generateBookingRef() {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SCA-${rand}`;
}

bookingForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = bookingForm;
  const checkin = f.checkin.value;
  const checkout = f.checkout.value;
  const guests = Number(f.guests.value);
  const children = Number(f.children.value || 0);

  statusMsg.className = 'status-msg';

  if (!checkin || !checkout) {
    statusMsg.textContent = 'Please choose both a check-in and check-out date.';
    statusMsg.className = 'status-msg error show';
    return;
  }
  if (new Date(checkout) <= new Date(checkin)) {
    statusMsg.textContent = 'Check-out must be after check-in.';
    statusMsg.className = 'status-msg error show';
    return;
  }
  if (guests > currentApartment.capacity_adults) {
    statusMsg.textContent = `This apartment sleeps up to ${currentApartment.capacity_adults} adults.`;
    statusMsg.className = 'status-msg error show';
    return;
  }

  const submitBtn = f.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Checking availability…';

  try {
    // Prevent double booking: check for any overlapping reservation on this apartment
    const { data: overlaps, error: availError } = await supabase
      .from('booking_availability')
      .select('checkin, checkout')
      .eq('apartment_id', currentApartment.id)
      .lt('checkin', checkout)
      .gt('checkout', checkin);

    if (availError) throw availError;

    if (overlaps && overlaps.length > 0) {
      statusMsg.textContent = 'Those dates were just taken for this apartment — please try different dates.';
      statusMsg.className = 'status-msg error show';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Booking';
      return;
    }

    const bookingRef = generateBookingRef();
    const { error: insertError } = await supabase.from('bookings').insert({
      apartment_id: currentApartment.id,
      apartment_name: currentApartment.name,
      guest_name: f.guest_name.value.trim(),
      guest_email: f.guest_email.value.trim(),
      guest_phone: f.guest_phone.value.trim(),
      guests,
      children,
      checkin,
      checkout,
      special_requests: f.special_requests.value.trim() || null,
      booking_ref: bookingRef,
      status: 'pending',
    });

    if (insertError) throw insertError;

    // Show confirmation summary
    bookingForm.classList.add('hidden');
    const conf = document.getElementById('bookingConfirmation');
    document.getElementById('confRef').textContent = bookingRef;
    document.getElementById('confSummary').innerHTML = `
      <div><span>Apartment</span><strong>${currentApartment.name}</strong></div>
      <div><span>Check-in</span><strong>${checkin}</strong></div>
      <div><span>Check-out</span><strong>${checkout}</strong></div>
      <div><span>Guests</span><strong>${guests} adult${guests > 1 ? 's' : ''}${children ? ', ' + children + ' children' : ''}</strong></div>
      <div><span>Status</span><strong>Pending confirmation</strong></div>
    `;
    conf.classList.add('show');
    showToast('Booking request sent — a confirmation email is on its way.');
    loadApartments();
  } catch (err) {
    console.error(err);
    statusMsg.textContent = 'Something went wrong sending your request. Please try again or contact us directly.';
    statusMsg.className = 'status-msg error show';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm Booking';
  }
});

loadApartments();
