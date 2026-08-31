import { supabase } from '../../js/supabase-config.js';
import { showToast } from '../../js/main.js';

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
let REPORT_DATA = {};

function nights(a, b) {
  return Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
}

function toCSV(rows) {
  return rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function downloadCSV(name, rows) {
  const blob = new Blob([toCSV(rows)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function load() {
  const [{ data: bookings }, { data: apartments }, { data: reservations }] = await Promise.all([
    supabase.from('bookings').select('*'),
    supabase.from('apartments').select('id, name'),
    supabase.from('restaurant_reservations').select('*'),
  ]);
  const b = bookings || [];
  const apts = apartments || [];
  const res = reservations || [];

  // Occupancy by apartment
  const occRows = apts.map(a => {
    const apBookings = b.filter(x => x.apartment_id === a.id);
    const nightsBooked = apBookings.filter(x => ACTIVE_STATUSES.includes(x.status)).reduce((s, x) => s + nights(x.checkin, x.checkout), 0);
    const rate = Math.min(100, Math.round((nightsBooked / 90) * 100)); // rough: against a 90-day window
    return [a.name, apBookings.length, nightsBooked, rate + '%'];
  });
  document.querySelector('#occupancyTable tbody').innerHTML = occRows.length ? occRows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('') : `<tr><td colspan="4" class="empty-state">No data yet.</td></tr>`;

  // Revenue by apartment
  const priceMap = Object.fromEntries((await supabase.from('apartments').select('id, price_per_night')).data.map(a => [a.id, Number(a.price_per_night)]));
  const revRows = apts.map(a => {
    const active = b.filter(x => x.apartment_id === a.id && ACTIVE_STATUSES.includes(x.status));
    const n = active.reduce((s, x) => s + nights(x.checkin, x.checkout), 0);
    const revenue = n * (priceMap[a.id] || 0);
    return [a.name, active.length, n, 'K' + revenue.toLocaleString()];
  });
  document.querySelector('#revenueTable tbody').innerHTML = revRows.length ? revRows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('') : `<tr><td colspan="4" class="empty-state">No data yet.</td></tr>`;

  // Restaurant report
  const statuses = ['pending','confirmed','seated','completed','cancelled'];
  const restRows = statuses.map(s => {
    const group = res.filter(r => r.status === s);
    return [s, group.length, group.reduce((sum, r) => sum + (r.party_size || 0), 0)];
  }).filter(r => r[1] > 0);
  document.querySelector('#restaurantTable tbody').innerHTML = restRows.length ? restRows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('') : `<tr><td colspan="3" class="empty-state">No reservations yet.</td></tr>`;

  // Booking trends — last 6 months
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('default', { month: 'short', year: 'numeric' }), total: 0, cancelled: 0, revenue: 0 });
  }
  b.forEach(x => {
    const d = new Date(x.checkin);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find(mm => mm.key === key);
    if (!m) return;
    m.total++;
    if (x.status === 'cancelled') m.cancelled++;
    if (ACTIVE_STATUSES.includes(x.status)) m.revenue += nights(x.checkin, x.checkout) * (priceMap[x.apartment_id] || 0);
  });
  document.querySelector('#trendsTable tbody').innerHTML = months.map(m => `<tr><td>${m.label}</td><td>${m.total}</td><td>${m.cancelled}</td><td>K${m.revenue.toLocaleString()}</td></tr>`).join('');

  REPORT_DATA = {
    occupancy: [['Apartment','Total Bookings','Nights Booked','Occupancy Rate'], ...occRows],
    revenue: [['Apartment','Confirmed+ Bookings','Nights Sold','Revenue'], ...revRows],
    restaurant: [['Status','Count','Total Covers'], ...restRows],
    trends: [['Month','Bookings','Cancelled','Revenue'], ...months.map(m => [m.label, m.total, m.cancelled, m.revenue])],
  };
}

document.querySelectorAll('[data-csv]').forEach(btn => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.csv;
    if (!REPORT_DATA[key]) { showToast('Report not ready yet.', 'error'); return; }
    downloadCSV(`serenity-courtyard-${key}-report`, REPORT_DATA[key]);
  });
});
document.getElementById('printBtn').addEventListener('click', () => window.print());

load();
