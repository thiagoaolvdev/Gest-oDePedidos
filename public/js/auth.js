function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (token && !isTokenExpired(token)) {
    window.location.href = '/app?token=' + encodeURIComponent(token);
    return;
  }
  if (token && isTokenExpired(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  const form = document.getElementById('loginForm');
  const nickInput = document.getElementById('nick');
  const passwordInput = document.getElementById('password');
  const rememberMe = document.getElementById('rememberMe');
  const eyeIcon = document.getElementById('eyeIcon');
  const loginBtn = document.getElementById('loginBtn');
  const loginBtnText = document.getElementById('loginBtnText');
  const loginBtnSpinner = document.getElementById('loginBtnSpinner');
  const loginError = document.getElementById('loginError');

  const remembered = localStorage.getItem('empresa_remember_nick');
  if (remembered) {
    nickInput.value = remembered;
    rememberMe.checked = true;
  }

  document.getElementById('togglePassword')?.addEventListener('click', () => {
    const show = passwordInput.type === 'password';
    passwordInput.type = show ? 'text' : 'password';
    eyeIcon.className = show ? 'bi bi-eye-slash' : 'bi bi-eye';
  });

  document.getElementById('forgotPassword')?.addEventListener('click', (e) => {
    e.preventDefault();
    loginError.classList.remove('d-none');
    loginError.textContent = 'Contate o administrador do sistema para redefinir sua senha.';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('d-none');
    loginBtn.disabled = true;
    loginBtnText.textContent = 'Entrando...';
    loginBtnSpinner.classList.remove('d-none');

    try {
      const data = await API.login(nickInput.value, passwordInput.value);
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = '/app?token=' + encodeURIComponent(data.token);
    } catch (err) {
      loginError.textContent = err.error || 'Erro ao fazer login';
      loginError.classList.remove('d-none');
    } finally {
      loginBtn.disabled = false;
      loginBtnText.textContent = 'Entrar';
      loginBtnSpinner.classList.add('d-none');
    }
  });
});
