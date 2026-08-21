// Views
const viewLogin = document.getElementById('view-login');
const viewRegister = document.getElementById('view-register');
const viewDashboard = document.getElementById('view-dashboard');

// Elements
const linkToRegister = document.getElementById('link-to-register');
const linkToLogin = document.getElementById('link-to-login');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const dashUsernameDisplay = document.getElementById('dash-username-display');
const btnLogout = document.getElementById('btn-logout');

// Navigation
const showView = (viewElement) => {
  [viewLogin, viewRegister, viewDashboard].forEach(v => {
    v.style.display = 'none';
  });
  viewElement.style.display = 'block';
};

linkToRegister.addEventListener('click', (e) => {
  e.preventDefault();
  showView(viewRegister);
  document.getElementById('login-error').textContent = '';
});

linkToLogin.addEventListener('click', (e) => {
  e.preventDefault();
  showView(viewLogin);
  document.getElementById('reg-error').textContent = '';
});

// Auth Handlers
formRegister.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-register');
  const errorMsg = document.getElementById('reg-error');
  
  const name = document.getElementById('reg-name').value;
  const username = document.getElementById('reg-username').value;
  const password = document.getElementById('reg-password').value;

  btn.textContent = 'Criando...';
  errorMsg.textContent = '';

  const response = await window.api.register(name, username, password);

  if (response.success) {
    // Show dashboard
    dashUsernameDisplay.textContent = response.user.name;
    showView(viewDashboard);
    formRegister.reset();
    btn.textContent = 'Criar Conta';
  } else {
    errorMsg.textContent = response.error;
    btn.textContent = 'Criar Conta';
  }
});

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.getElementById('btn-login');
  const errorMsg = document.getElementById('login-error');
  
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  btn.textContent = 'Autenticando...';
  errorMsg.textContent = '';

  const response = await window.api.login(username, password);

  if (response.success) {
    // Show dashboard
    dashUsernameDisplay.textContent = response.user.name;
    showView(viewDashboard);
    formLogin.reset();
    btn.textContent = 'Entrar';
  } else {
    errorMsg.textContent = response.error;
    btn.textContent = 'Entrar';
  }
});

btnLogout.addEventListener('click', () => {
  showView(viewLogin);
});

// Demo test button for now
document.getElementById('btn-start').addEventListener('click', async () => {
    const btn = document.getElementById('btn-start');
    btn.textContent = 'Tudo Funcionando!';
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
});
