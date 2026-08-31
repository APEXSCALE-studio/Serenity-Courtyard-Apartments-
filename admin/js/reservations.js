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

async function load() {
  const { data, error } = await supabase.from('restaurant_reservations').select('*').order('reservation_date', { ascending: false });
  if (error) { showToast('Could not load reservations.', 'error'); return; }
  ALL = data || [];
  render();
}

function render() {
  const search = document.getElementById('fSearch').value.trim().toLowerCase();
  const status = document.getElementById('fStatus').value;
  let list = ALL;
  if (search) list = list.filter(r => r.guest_name.toLowerCase().includes(search) || r.guest_email.toLowerCase().includes(search));
  if (status) list = list.filter(r => r.status === status);

  const tbody = document.querySelector('#resTable tbody');
  tbody.innerHTML = list.length ? list.map(r => `
    <tr>
      <td>${r.guest_name}<br><span style="color:#8a8474;font-size:.78rem">${r.guest_email}</span></td>
      <td>${r.party_size}</td>
      <td>${r.reservation_date}</td>
      <td>${r.reservation_time}</td>
      <td>
        <select class="inline-select status-select" data-id="${r.id}">
          ${['pending','confirmed','seated','completed','cancelled'].map(s =>
            `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td><button class="icon-btn danger delete-btn" data-id="${r.id}">Delete</button></td>
    </tr>
  `).join('') : `<tr><td colspan="6" class="empty-state">No reservations match.</td></tr>`;

  tbody.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const { error } = await supabase.from('restaurant_reservations').update({ status: sel.value }).eq('id', sel.dataset.id);
      if (error) { showToast('Could not update status.', 'error'); return; }
      showToast('Reservation updated.');
      await load();
    });
  });
  tbody.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Delete this reservation?')) return;
    const { error } = await supabase.from('restaurant_reservations').delete().eq('id', btn.dataset.id);
    if (error) { showToast('Could not delete.', 'error'); return; }
    showToast('Reservation deleted.');
    await load();
  }));
}

document.getElementById('fSearch').addEventListener('input', render);
document.getElementById('fStatus').addEventListener('change', render);

load();
