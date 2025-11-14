/**
 * CEDUP League - Sistema de Autenticação
 */

let usuarioAtual = null;

// ============================================
// ALTERNAR ENTRE LOGIN E CADASTRO
// ============================================

function mostrarLogin() {
    document.getElementById('form-login').classList.remove('hidden');
    document.getElementById('form-cadastro').classList.add('hidden');
    
    document.getElementById('btn-login').classList.add('bg-white', 'shadow-sm', 'text-blue-600');
    document.getElementById('btn-login').classList.remove('text-gray-600');
    
    document.getElementById('btn-cadastro').classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
    document.getElementById('btn-cadastro').classList.add('text-gray-600');
    
    limparMensagem();
}

function mostrarCadastro() {
    document.getElementById('form-login').classList.add('hidden');
    document.getElementById('form-cadastro').classList.remove('hidden');
    
    document.getElementById('btn-cadastro').classList.add('bg-white', 'shadow-sm', 'text-blue-600');
    document.getElementById('btn-cadastro').classList.remove('text-gray-600');
    
    document.getElementById('btn-login').classList.remove('bg-white', 'shadow-sm', 'text-blue-600');
    document.getElementById('btn-login').classList.add('text-gray-600');
    
    limparMensagem();
}

// ============================================
// MENSAGENS
// ============================================

function mostrarMensagem(mensagem, tipo = 'info') {
    const container = document.getElementById('mensagem-auth');
    container.classList.remove('hidden');
    
    const cores = {
        'sucesso': 'bg-green-100 border-green-400 text-green-800',
        'erro': 'bg-red-100 border-red-400 text-red-800',
        'info': 'bg-blue-100 border-blue-400 text-blue-800'
    };
    
    container.className = `mt-4 p-4 rounded-lg border ${cores[tipo]}`;
    container.textContent = mensagem;
}

function limparMensagem() {
    const container = document.getElementById('mensagem-auth');
    container.classList.add('hidden');
    container.textContent = '';
}

// ============================================
// LOGIN
// ============================================

async function fazerLogin(email, senha) {
    try {
        console.log('🔐 Tentando fazer login...');
        
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (authError) {
            console.error('❌ Erro de autenticação:', authError);
            throw new Error('Email ou senha inválidos');
        }

        console.log('✅ Autenticação bem-sucedida:', authData.user.email);

        // Buscar dados do usuário usando RPC
        const { data: userData, error: userError } = await supabase
            .rpc('get_user_by_id', { user_id: authData.user.id });

        if (userError || !userData || userData.length === 0) {
            console.error('❌ Erro ao buscar dados do usuário:', userError);
            throw new Error('Erro ao carregar dados do usuário');
        }

        const user = userData[0];
        console.log('✅ Dados do usuário carregados:', user);
        usuarioAtual = user;

        mostrarMensagem('Login realizado com sucesso! Redirecionando...', 'sucesso');
        
        setTimeout(() => {
            if (user.role === 'admin' || user.is_admin) {
                console.log('🔑 Redirecionando para painel admin...');
                window.location.href = 'admin.html';
            } else {
                console.log('👤 Redirecionando para dashboard...');
                window.location.href = 'dashboard.html';
            }
        }, 1000);

    } catch (error) {
        console.error('❌ Erro no login:', error);
        mostrarMensagem(error.message, 'erro');
    }
}

// ============================================
// CADASTRO
// ============================================

async function fazerCadastro(teamName, email, senha) {
    try {
        console.log('🔐 Iniciando cadastro...');

        if (!teamName || teamName.length < 3) {
            throw new Error('Nome do time deve ter pelo menos 3 caracteres');
        }

        if (!email || !email.includes('@')) {
            throw new Error('Email inválido');
        }

        if (!senha || senha.length < 6) {
            throw new Error('Senha deve ter pelo menos 6 caracteres');
        }

        mostrarMensagem('Criando sua conta...', 'info');

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: email,
            password: senha
        });

        if (signUpError) {
            console.error('❌ Erro no Auth:', signUpError);
            
            if (signUpError.message.includes('already registered')) {
                throw new Error('📧 Este email já está cadastrado. Faça login.');
            }
            
            throw new Error(signUpError.message);
        }

        if (!signUpData.user) {
            throw new Error('Erro ao criar usuário. Tente novamente.');
        }

        console.log('✅ Usuário criado no Auth:', signUpData.user.id);

        // Fazer login se sessão não foi criada automaticamente
        let session = signUpData.session;
        
        if (!session) {
            console.log('🔐 Fazendo login manual...');
            
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: email,
                password: senha
            });

            if (signInError) {
                throw new Error('Conta criada, mas não foi possível fazer login. Tente fazer login manualmente.');
            }

            session = signInData.session;
            console.log('✅ Login manual bem-sucedido');
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        // Criar perfil na tabela users
        console.log('📊 Criando perfil na tabela users...');
        
        const { data: userData, error: userError } = await supabase
            .from('users')
            .insert([
                {
                    id: signUpData.user.id,
                    email: email,
                    team_name: teamName,
                    role: 'user',
                    is_admin: false,
                    cartoletas: 40.00,
                    total_points: 0
                }
            ])
            .select()
            .single();

        if (userError) {
            console.error('❌ Erro ao criar perfil:', userError);
            
            if (userError.code === '23505') {
                console.log('⚠️ Perfil já existe, fazendo login...');
                mostrarMensagem('✅ Conta já existe! Redirecionando...', 'sucesso');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
                return;
            }
            
            throw new Error(`Erro ao criar perfil: ${userError.message}`);
        }

        console.log('✅ Perfil criado com sucesso:', userData);

        mostrarMensagem('✅ Conta criada com sucesso! Redirecionando...', 'sucesso');

        setTimeout(() => {
            console.log('🔄 Redirecionando para dashboard...');
            window.location.href = 'dashboard.html';
        }, 2000);

    } catch (error) {
        console.error('❌ ERRO:', error);
        mostrarMensagem('❌ ' + error.message, 'erro');
    }
}

// ============================================
// VERIFICAR AUTENTICAÇÃO
// ============================================

async function verificarAutenticacao() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            console.log('⚠️ Usuário não autenticado');
            window.location.href = 'index.html';
            return null;
        }

        console.log('✅ Usuário autenticado:', user.email);

        // Buscar dados usando RPC
        const { data: userData, error: userError } = await supabase
            .rpc('get_user_by_id', { user_id: user.id });

        if (userError || !userData || userData.length === 0) {
            console.error('❌ Erro ao buscar dados:', userError);
            return null;
        }

        usuarioAtual = userData[0];
        return usuarioAtual;

    } catch (error) {
        console.error('❌ Erro ao verificar autenticação:', error);
        window.location.href = 'index.html';
        return null;
    }
}

// ============================================
// LOGOUT
// ============================================

async function logout() {
    try {
        console.log('🚪 Fazendo logout...');
        
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        console.log('✅ Logout realizado');
        window.location.href = 'index.html';
        
    } catch (error) {
        console.error('❌ Erro ao fazer logout:', error);
        alert('Erro ao sair: ' + error.message);
    }
}

// ============================================
// EVENTOS DOS FORMULÁRIOS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ auth.js carregado');

    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value.trim();
            const senha = document.getElementById('login-senha').value;
            
            await fazerLogin(email, senha);
        });
    }

    const formCadastro = document.getElementById('form-cadastro');
    if (formCadastro) {
        formCadastro.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const teamName = document.getElementById('cadastro-time').value.trim();
            const email = document.getElementById('cadastro-email').value.trim();
            const senha = document.getElementById('cadastro-senha').value;
            
            await fazerCadastro(teamName, email, senha);
        });
    }
});

// Exportar para uso global
window.mostrarLogin = mostrarLogin;
window.mostrarCadastro = mostrarCadastro;
window.logout = logout;
window.verificarAutenticacao = verificarAutenticacao;