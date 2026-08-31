import { supabase } from '../../js/supabase-config.js';

// If already logged in, skip straight to the dashboard
const { data: { session } } = await supabase.auth.getSession();
if (session) window.location.href = 'index.html';

const form = document.getElementById('loginForm');
const statusMsg = document.getElementById('loginStatus');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusMsg.className = 'status-msg';
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  const { error } = await supabase.auth.signInWithPassword({
    email: form.email.value.trim(),
    password: form.password.value,
  });

  if (error) {
    const isNetworkError = error.message?.toLowerCase().includes('fetch') || error.name === 'AuthRetryableFetchError';
    statusMsg.textContent = isNetworkError
      ? "Couldn't reach the login server — this preview may not have internet access. Try the live deployed URL instead."
      : 'Incorrect email or password.';
    statusMsg.className = 'status-msg error show';
    btn.disabled = false;
    btn.textContent = 'Sign In';
    return;
  }
  window.location.href = 'index.html';
});
