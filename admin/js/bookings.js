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

let ALL = [];
let APARTMENTS = [];

async function load() {
  const [{ data: bookings, error }, { data: apts }] = await Promise.all([
    supabase.from('bookings').select('*').order('created_at', { ascending: false }),
    supabase.from('apartments').select('id, name'),
  ]);
  if (error) { console.error(error); showToast('Could not load bookings.', 'error'); return; }
  ALL = bookings || [];
  APARTMENTS = apts || [];

  const fApt = document.getElementById('fApartment');
  fApt.innerHTML = '<option value="">All apartments</option>' + APARTMENTS.map(a => `<option value="${a.id}">${a.name}</option>`).join('');

  render();
}

function render() {
  const search = document.getElementById('fSearch').value.trim().toLowerCase();
  const status = document.getElementById('fStatus').value;
  const apt = document.getElementById('fApartment').value;

  let list = ALL;
  if (search) list = list.filter(b =>
    (b.guest_name || '').toLowerCase().includes(search) ||
    (b.guest_email || '').toLowerCase().includes(search) ||
    (b.booking_ref || '').toLowerCase().includes(search)
  );
  if (status) list = list.filter(b => b.status === status);
  if (apt) list = list.filter(b => b.apartment_id === apt);

  const tbody = document.querySelector('#bookingsTable tbody');
  tbody.innerHTML = list.length ? list.map(b => `
    <tr>
      <td>${b.booking_ref || '—'}</td>
      <td>${b.guest_name}<br><span style="color:#8a8474;font-size:.78rem">${b.guest_email}</span></td>
      <td>${b.apartment_name}</td>
      <td>${b.checkin}</td>
      <td>${b.checkout}</td>
      <td>${b.guests}${b.children ? ' +' + b.children + ' ch' : ''}</td>
      <td>
        <select class="inline-select status-select" data-id="${b.id}">
          ${['pending','confirmed','cancelled','checked_in','checked_out'].map(s =>
            `<option value="${s}" ${s === b.status ? 'selected' : ''}>${s.replace('_',' ')}</option>`).join('')}
        </select>
      </td>
      <td class="no-print" style="white-space:nowrap">
        <button class="icon-btn edit-btn" data-id="${b.id}">Edit</button>
        <button class="icon-btn danger delete-btn" data-id="${b.id}">Delete</button>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="8" class="empty-state">No bookings match your filters.</td></tr>`;

  tbody.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const { error } = await supabase.from('bookings').update({ status: sel.value }).eq('id', sel.dataset.id);
      if (error) { showToast('Could not update status.', 'error'); return; }
      showToast('Booking status updated.');
      await load();
    });
  });
  tbody.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => openEdit(btn.dataset.id)));
  tbody.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => remove(btn.dataset.id)));
}

async function remove(id) {
  if (!confirm('Delete this booking permanently? This cannot be undone.')) return;
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) { showToast('Could not delete booking.', 'error'); return; }
  showToast('Booking deleted.');
  await load();
}

// Edit modal
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const editStatus = document.getElementById('editStatus');

function openEdit(id) {
  const b = ALL.find(x => x.id === id);
  if (!b) return;
  editForm.id.value = b.id;
  editForm.checkin.value = b.checkin;
  editForm.checkout.value = b.checkout;
  editForm.guests.value = b.guests;
  editForm.children.value = b.children || 0;
  editForm.guest_name.value = b.guest_name;
  editForm.guest_email.value = b.guest_email;
  editForm.guest_phone.value = b.guest_phone;
  editForm.special_requests.value = b.special_requests || '';
  editForm.status.value = b.status;
  editStatus.className = 'status-msg';
  editModal.classList.add('open');
}
document.getElementById('editModalClose')?.addEventListener('click', () => editModal.classList.remove('open'));
editModal?.addEventListener('click', (e) => { if (e.target === editModal) editModal.classList.remove('open'); });

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = editForm;
  if (new Date(f.checkout.value) <= new Date(f.checkin.value)) {
    editStatus.textContent = 'Check-out must be after check-in.';
    editStatus.className = 'status-msg error show';
    return;
  }
  const { error } = await supabase.from('bookings').update({
    checkin: f.checkin.value,
    checkout: f.checkout.value,
    guests: Number(f.guests.value),
    children: Number(f.children.value || 0),
    guest_name: f.guest_name.value.trim(),
    guest_email: f.guest_email.value.trim(),
    guest_phone: f.guest_phone.value.trim(),
    special_requests: f.special_requests.value.trim() || null,
    status: f.status.value,
  }).eq('id', f.id.value);

  if (error) {
    editStatus.textContent = 'Could not save changes.';
    editStatus.className = 'status-msg error show';
    return;
  }
  editModal.classList.remove('open');
  showToast('Booking updated.');
  await load();
});

document.getElementById('fSearch').addEventListener('input', render);
document.getElementById('fStatus').addEventListener('change', render);
document.getElementById('fApartment').addEventListener('change', render);
document.getElementById('printBtn').addEventListener('click', () => window.print());

load();
