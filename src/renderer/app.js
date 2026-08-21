document.getElementById('btn-start').addEventListener('click', async () => {
    const btn = document.getElementById('btn-start');
    btn.textContent = 'Testando Banco...';
    btn.style.opacity = '0.7';
    btn.style.transform = 'scale(0.95)';
    
    try {
        // Inserindo uma conta de teste
        const newAccount = await window.api.addAccount({ name: 'Carteira Física', balance: 150.50 });
        console.log('Conta criada:', newAccount);

        // Buscando todas as contas
        const accounts = await window.api.getAccounts();
        console.log('Todas as contas:', accounts);

        btn.textContent = `Banco OK! (${accounts.length} Contas)`;
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    } catch (error) {
        console.error('Erro de Banco de Dados:', error);
        btn.textContent = 'Erro no DB';
        btn.style.background = '#ef4444';
    } finally {
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1)';
    }
});
