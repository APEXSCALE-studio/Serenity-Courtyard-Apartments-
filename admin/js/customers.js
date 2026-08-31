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

let CUSTOMERS = [];

async function load() {
  const [{ data: bookings }, { data: notes }] = await Promise.all([
    supabase.from('bookings').select('*').order('created_at', { ascending: false }),
    supabase.from('customer_notes').select('*'),
  ]);
  const notesMap = Object.fromEntries((notes || []).map(n => [n.email, n]));

  const byEmail = {};
  (bookings || []).forEach(b => {
    const key = b.guest_email;
    if (!byEmail[key]) byEmail[key] = { email: key, name: b.guest_name, phone: b.guest_phone, bookings: [] };
    byEmail[key].bookings.push(b);
  });

  CUSTOMERS = Object.values(byEmail).map(c => ({
    ...c,
    notes: notesMap[c.email]?.notes || '',
    lastStay: c.bookings.map(b => b.checkin).sort().reverse()[0],
  }));

  render();
}

function render() {
  const search = document.getElementById('fSearch').value.trim().toLowerCase();
  let list = CUSTOMERS;
  if (search) list = list.filter(c =>
    c.name.toLowerCase().includes(search) || c.email.toLowerCase().includes(search) || (c.phone || '').includes(search)
  );
  list.sort((a, b) => (b.lastStay || '').localeCompare(a.lastStay || ''));

  const tbody = document.querySelector('#custTable tbody');
  tbody.innerHTML = list.length ? list.map(c => `
    <tr>
      <td>${c.name}</td>
      <td>${c.email}</td>
      <td>${c.phone || '—'}</td>
      <td>${c.bookings.length}</td>
      <td>${c.lastStay || '—'}</td>
      <td><button class="icon-btn view-btn" data-email="${c.email}">View / Notes</button></td>
    </tr>
  `).join('') : `<tr><td colspan="6" class="empty-state">No customers yet — bookings will appear here.</td></tr>`;

  tbody.querySelectorAll('.view-btn').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.email)));
}

const modal = document.getElementById('custModal');
const notesForm = document.getElementById('notesForm');

function openModal(email) {
  const c = CUSTOMERS.find(x => x.email === email);
  if (!c) return;
  document.getElementById('custModalName').textContent = c.name;
  document.getElementById('custModalEmail').textContent = c.email;
  document.getElementById('custBookingHistory').innerHTML = c.bookings.map(b =>
    `<div style="padding:8px 0;border-bottom:1px dashed rgba(43,41,36,.12)">${b.apartment_name} — ${b.checkin} to ${b.checkout} <span class="pill pill-${b.status}" style="margin-left:6px">${b.status.replace('_',' ')}</span></div>`
  ).join('') || 'No bookings.';
  notesForm.email.value = c.email;
  notesForm.notes.value = c.notes;
  modal.classList.add('open');
}
document.getElementById('custModalClose').addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

notesForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const c = CUSTOMERS.find(x => x.email === notesForm.email.value);
  const { error } = await supabase.from('customer_notes').upsert({
    email: notesForm.email.value,
    name: c?.name,
    phone: c?.phone,
    notes: notesForm.notes.value.trim(),
    updated_at: new Date().toISOString(),
  });
  if (error) { showToast('Could not save notes.', 'error'); return; }
  showToast('Notes saved.');
  modal.classList.remove('open');
  await load();
});

document.getElementById('fSearch').addEventListener('input', render);

load();
