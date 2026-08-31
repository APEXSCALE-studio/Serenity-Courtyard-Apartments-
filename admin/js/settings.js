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

const bizForm = document.getElementById('bizForm');
const emailForm = document.getElementById('emailForm');
const pwForm = document.getElementById('pwForm');

async function load() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) document.getElementById('currentAdminEmail').textContent = session.user.email;

  const { data } = await supabase.from('settings').select('*');
  const map = Object.fromEntries((data || []).map(s => [s.key, s.value]));

  const biz = map.business_info || {};
  bizForm.name.value = biz.name || '';
  bizForm.phone1.value = biz.phone1 || '';
  bizForm.phone2.value = biz.phone2 || '';
  bizForm.email1.value = biz.email1 || '';
  bizForm.email2.value = biz.email2 || '';
  bizForm.location.value = biz.location || '';

  const email = map.email_settings || {};
  emailForm.from_name.value = email.from_name || '';
  emailForm.notify_email.value = email.notify_email || '';
  emailForm.booking_confirmation_enabled.checked = !!email.booking_confirmation_enabled;
}

bizForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = {
    name: bizForm.name.value.trim(),
    phone1: bizForm.phone1.value.trim(),
    phone2: bizForm.phone2.value.trim(),
    email1: bizForm.email1.value.trim(),
    email2: bizForm.email2.value.trim(),
    location: bizForm.location.value.trim(),
  };
  const { error } = await supabase.from('settings').upsert({ key: 'business_info', value, updated_at: new Date().toISOString() });
  const statusMsg = document.getElementById('bizStatus');
  if (error) { statusMsg.textContent = 'Could not save.'; statusMsg.className = 'status-msg error show'; return; }
  statusMsg.textContent = 'Saved.'; statusMsg.className = 'status-msg success show';
  showToast('Business information saved.');
});

emailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const value = {
    from_name: emailForm.from_name.value.trim(),
    notify_email: emailForm.notify_email.value.trim(),
    booking_confirmation_enabled: emailForm.booking_confirmation_enabled.checked,
  };
  const { error } = await supabase.from('settings').upsert({ key: 'email_settings', value, updated_at: new Date().toISOString() });
  const statusMsg = document.getElementById('emailStatus');
  if (error) { statusMsg.textContent = 'Could not save.'; statusMsg.className = 'status-msg error show'; return; }
  statusMsg.textContent = 'Saved.'; statusMsg.className = 'status-msg success show';
  showToast('Email settings saved.');
});

pwForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const statusMsg = document.getElementById('pwStatus');
  if (pwForm.password.value !== pwForm.password2.value) {
    statusMsg.textContent = 'Passwords do not match.';
    statusMsg.className = 'status-msg error show';
    return;
  }
  const { error } = await supabase.auth.updateUser({ password: pwForm.password.value });
  if (error) {
    statusMsg.textContent = 'Could not update password.';
    statusMsg.className = 'status-msg error show';
    return;
  }
  statusMsg.textContent = 'Password updated.';
  statusMsg.className = 'status-msg success show';
  pwForm.reset();
  showToast('Password changed.');
});

load();
