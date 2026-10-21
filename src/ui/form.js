// Contact form — client-side validation only (8.8).
export function initForm() {
  const form = document.getElementById('quote-form');
  if (!form) return;
  const msg = {
    required: form.dataset.errRequired,
    email: form.dataset.errEmail,
    phone: form.dataset.errPhone,
    select: form.dataset.errSelect,
  };
  const success = form.querySelector('.form-success');
  const fields = [...form.querySelectorAll('input, select, textarea')];

  function check(el) {
    const v = el.value.trim();
    let err = '';
    if (el.required && !v) err = el.tagName === 'SELECT' ? msg.select : msg.required;
    else if (v && el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) err = msg.email;
    else if (v && el.type === 'tel' && !/^[+()\d\s-]{7,20}$/.test(v)) err = msg.phone;
    const field = el.closest('.field');
    const out = document.getElementById(el.getAttribute('aria-describedby'));
    field.classList.toggle('is-invalid', !!err);
    field.classList.toggle('has-value', !!v);
    el.setAttribute('aria-invalid', err ? 'true' : 'false');
    if (out) out.textContent = err;
    return !err;
  }

  fields.forEach((el) => {
    el.addEventListener('blur', () => el.value && check(el));
    el.addEventListener('input', () => el.closest('.field').classList.contains('is-invalid') && check(el));
    el.addEventListener('change', () => el.tagName === 'SELECT' && check(el));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = fields.filter((el) => !check(el));
    if (bad.length) {
      bad[0].focus();
      return;
    }
    // TODO: connect form endpoint (Formspree/Netlify Forms/own API)
    success.textContent = form.dataset.success;
    success.hidden = false;
    form.reset();
    fields.forEach((el) => el.closest('.field').classList.remove('has-value'));
  });
}
