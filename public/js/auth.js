if (sessionStorage.getItem('ft_user')) location.replace('dashboard.html');

const tabs = { login: $('tab-login'), register: $('tab-register') };
function showTab(name) {
  Object.keys(tabs).forEach(k => {
    tabs[k].setAttribute('aria-selected', k === name);
    $('form-' + k).hidden = k !== name;
  });
  $('auth-error').textContent = '';
}
tabs.login.onclick = () => showTab('login');
tabs.register.onclick = () => showTab('register');

$('form-login').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const r = await api('POST', '/api/auth/login', { email: $('login-email').value.trim(), password: $('login-password').value });
    sessionStorage.setItem('ft_user', JSON.stringify(r.user || { name: 'Athlete' }));
    location.href = 'dashboard.html';
  } catch (err) { $('auth-error').textContent = err.message; }
});

$('form-register').addEventListener('submit', async e => {
  e.preventDefault();
  const pw = $('reg-password').value;
  if (pw.length < 6) { $('auth-error').textContent = 'Use at least 6 characters for the password.'; return; }
  try {
    await api('POST', '/api/auth/register', {
      name: $('reg-name').value.trim(), email: $('reg-email').value.trim(), password: pw,
      age: Number($('reg-age').value) || null, gender: $('reg-gender').value
    });
    showTab('login'); $('login-email').value = $('reg-email').value;
    $('auth-error').textContent = ''; toast('Account created. Log in to continue.');
  } catch (err) { $('auth-error').textContent = err.message; }
});
