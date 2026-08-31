import { supabase } from './supabase-config.js';
import { showToast } from './main.js';

const form = document.getElementById('contactForm');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type="submit"]');
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Sending…';

  const { error } = await supabase.from('messages').insert({
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    message: form.message.value.trim(),
  });

  btn.disabled = false;
  btn.textContent = original;

  if (error) {
    console.error(error);
    showToast("Couldn't send your message — please try again or call us directly.", 'error');
    return;
  }
  showToast("Message sent — we'll reply within 24 hours.");
  form.reset();
});
