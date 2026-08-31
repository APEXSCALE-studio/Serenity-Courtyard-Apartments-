import { supabase } from '../../js/supabase-config.js';

document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  document.querySelector('.admin-sidebar')?.classList.toggle('open');
});
document.querySelectorAll('.logout-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  });
});
const currentPage = (location.pathname.split('/').pop() || 'index.html');
document.querySelectorAll('.admin-nav a').forEach(a => {
  if (a.getAttribute('href') === currentPage) a.classList.add('active');
});
async function requireSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return null; }
  const whoEl = document.querySelector('.who');
  if (whoEl) whoEl.textContent = session.user.email;
  return session;
}
requireSession();

const ACTIVE_STATUSES = ['confirmed', 'checked_in', 'checked_out'];

function nightsBetween(a, b) {
  const ms = new Date(b) - new Date(a);
  return Math.max(1, Math.round(ms / 86400000));
}

async function load() {
  const [{ data: bookings }, { data: apartments }, { data: reservations }, { data: messages }] = await Promise.all([
    supabase.from('bookings').select('*'),
    supabase.from('apartments').select('id, price_per_night, available'),
    supabase.from('restaurant_reservations').select('id, status'),
    supabase.from('messages').select('id, is_read'),
  ]);

  const b = bookings || [];
  const apts = apartments || [];
  const priceMap = Object.fromEntries(apts.map(a => [a.id, Number(a.price_per_night)]));

  document.getElementById('statBookings').textContent = b.length;
  document.getElementById('statPending').textContent = b.filter(x => x.status === 'pending').length;
  document.getElementById('statCheckedIn').textContent = b.filter(x => x.status === 'checked_in').length;
  document.getElementById('statAvailable').textContent = apts.filter(a => a.available).length + ' / ' + apts.length;
  document.getElementById('statReservations').textContent = (reservations || []).length;
  document.getElementById('statMessages').textContent = (messages || []).filter(m => !m.is_read).length + ' unread';

  const revenue = b
    .filter(x => ACTIVE_STATUSES.includes(x.status))
    .reduce((sum, x) => sum + (priceMap[x.apartment_id] || 0) * nightsBetween(x.checkin, x.checkout), 0);
  document.getElementById('statRevenue').textContent = 'K' + revenue.toLocaleString();

  // Occupancy: booked apartment-nights this month vs total available apartment-nights this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  let bookedNights = 0;
  b.filter(x => ACTIVE_STATUSES.includes(x.status)).forEach(x => {
    const ci = new Date(Math.max(new Date(x.checkin), monthStart));
    const co = new Date(Math.min(new Date(x.checkout), monthEnd.getTime() + 86400000));
    if (co > ci) bookedNights += Math.round((co - ci) / 86400000);
  });
  const totalApartmentNights = apts.length * daysInMonth || 1;
  const occupancy = Math.min(100, Math.round((bookedNights / totalApartmentNights) * 100));
  document.getElementById('statOccupancy').textContent = occupancy + '%';

  // Monthly chart — last 6 months by check-in month
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('default', { month: 'short' }), count: 0 });
  }
  b.forEach(x => {
    const d = new Date(x.checkin);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find(mm => mm.key === key);
    if (m) m.count++;
  });
  const max = Math.max(1, ...months.map(m => m.count));
  const chart = document.getElementById('monthlyChart');
  chart.innerHTML = months.map(m => `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px">
      <div style="width:100%;background:var(--beige);border-radius:6px 6px 0 0;height:${Math.max(6, (m.count / max) * 130)}px;background:var(--forest);position:relative;display:flex;align-items:flex-start;justify-content:center">
        <span style="position:absolute;top:-22px;font-size:.78rem;color:var(--charcoal);font-weight:600">${m.count}</span>
      </div>
      <span style="font-size:.78rem;color:#8a8474">${m.label}</span>
    </div>
  `).join('');

  // Recent bookings
  const recent = [...b].sort((x, y) => new Date(y.created_at || 0) - new Date(x.created_at || 0)).slice(0, 6);
  const tbody = document.querySelector('#recentBookingsTable tbody');
  tbody.innerHTML = recent.length ? recent.map(x => `
    <tr>
      <td>${x.guest_name}</td>
      <td>${x.apartment_name}</td>
      <td>${x.checkin}</td>
      <td>${x.checkout}</td>
      <td><span class="pill pill-${x.status}">${x.status.replace('_',' ')}</span></td>
    </tr>
  `).join('') : `<tr><td colspan="5" class="empty-state">No bookings yet.</td></tr>`;
}

load();
