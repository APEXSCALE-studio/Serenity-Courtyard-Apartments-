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
  const { data, error } = await supabase.from('apartments').select('*').order('sort_order');
  if (error) { showToast('Could not load apartments.', 'error'); return; }
  ALL = data || [];
  render();
}

function render() {
  const tbody = document.querySelector('#aptTable tbody');
  tbody.innerHTML = ALL.length ? ALL.map(a => `
    <tr>
      <td>${a.name}<br><span style="color:#8a8474;font-size:.78rem">${a.id}</span></td>
      <td>K${Number(a.price_per_night).toLocaleString()}</td>
      <td>${a.capacity_adults}</td>
      <td>${a.bedrooms}</td>
      <td>
        <select class="inline-select avail-select" data-id="${a.id}">
          <option value="true" ${a.available ? 'selected' : ''}>Available</option>
          <option value="false" ${!a.available ? 'selected' : ''}>Unavailable</option>
        </select>
      </td>
      <td style="white-space:nowrap">
        <button class="icon-btn edit-btn" data-id="${a.id}">Edit</button>
        <button class="icon-btn danger delete-btn" data-id="${a.id}">Delete</button>
      </td>
    </tr>
  `).join('') : `<tr><td colspan="6" class="empty-state">No apartments yet — add your first one.</td></tr>`;

  tbody.querySelectorAll('.avail-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const { error } = await supabase.from('apartments').update({ available: sel.value === 'true' }).eq('id', sel.dataset.id);
      if (error) { showToast('Could not update availability.', 'error'); return; }
      showToast('Availability updated.');
      await load();
    });
  });
  tbody.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.id)));
  tbody.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => remove(btn.dataset.id)));
}

async function remove(id) {
  if (!confirm('Delete this apartment? Existing bookings will keep their historical data, but the apartment will no longer be bookable.')) return;
  const { error } = await supabase.from('apartments').delete().eq('id', id);
  if (error) { showToast('Could not delete — it may have existing bookings referencing it.', 'error'); return; }
  showToast('Apartment deleted.');
  await load();
}

const modal = document.getElementById('aptModal');
const form = document.getElementById('aptForm');
const statusMsg = document.getElementById('aptStatus');
const title = document.getElementById('aptModalTitle');

function openModal(id) {
  form.reset();
  statusMsg.className = 'status-msg';
  if (id) {
    const a = ALL.find(x => x.id === id);
    title.textContent = 'Edit Apartment';
    form._editing_id.value = a.id;
    form.id.value = a.id;
    form.id.disabled = true;
    form.name.value = a.name;
    form.tagline.value = a.tagline || '';
    form.description.value = a.description || '';
    form.price_per_night.value = a.price_per_night;
    form.bedrooms.value = a.bedrooms;
    form.capacity_adults.value = a.capacity_adults;
    form.capacity_children.value = a.capacity_children;
    form.features.value = (a.features || []).join(', ');
    form.images.value = (a.images || []).join(', ');
    form.available.checked = a.available;
  } else {
    title.textContent = 'Add Apartment';
    form._editing_id.value = '';
    form.id.disabled = false;
  }
  modal.classList.add('open');
}
document.getElementById('newAptBtn').addEventListener('click', () => openModal(null));
document.getElementById('aptModalClose').addEventListener('click', () => modal.classList.remove('open'));
modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const isEditing = !!form._editing_id.value;
  const payload = {
    id: form.id.value.trim(),
    name: form.name.value.trim(),
    tagline: form.tagline.value.trim() || null,
    description: form.description.value.trim() || null,
    price_per_night: Number(form.price_per_night.value),
    bedrooms: Number(form.bedrooms.value),
    capacity_adults: Number(form.capacity_adults.value),
    capacity_children: Number(form.capacity_children.value),
    features: form.features.value.split(',').map(s => s.trim()).filter(Boolean),
    images: form.images.value.split(',').map(s => s.trim()).filter(Boolean),
    available: form.available.checked,
  };

  const { error } = isEditing
    ? await supabase.from('apartments').update(payload).eq('id', payload.id)
    : await supabase.from('apartments').insert(payload);

  if (error) {
    statusMsg.textContent = error.message.includes('duplicate') ? 'That apartment ID is already in use.' : 'Could not save apartment.';
    statusMsg.className = 'status-msg error show';
    return;
  }
  modal.classList.remove('open');
  showToast(isEditing ? 'Apartment updated.' : 'Apartment added.');
  await load();
});

load();
