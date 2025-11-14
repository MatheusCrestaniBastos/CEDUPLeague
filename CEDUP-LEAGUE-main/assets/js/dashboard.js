/**
 * CEDUP League - Dashboard
 */

let usuarioLogado = null;

// ============================================
// INICIALIZAR DASHBOARD
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📊 Dashboard carregando...');
    
    // Verificar autenticação
    usuarioLogado = await verificarAutenticacao();
    
    if (!usuarioLogado) {
        console.log('❌ Usuário não autenticado');
        return;
    }
    
    console.log('✅ Usuário logado:', usuarioLogado.email);
    
    // Mostrar link admin se for admin
    if (usuarioLogado.role === 'admin' || usuarioLogado.is_admin) {
        const linkAdmin = document.getElementById('link-admin');
        if (linkAdmin) {
            linkAdmin.classList.remove('hidden');
        }
    }
    
    // Carregar dados
    await carregarDadosUsuario();
    await carregarRanking();
    await carregarHistorico();
});

// ============================================
// CARREGAR DADOS DO USUÁRIO
// ============================================

async function carregarDadosUsuario() {
    try {
        console.log('📊 Carregando dados do usuário...');
        
        // Atualizar nome do time
        const elementsTeamName = document.querySelectorAll('#user-team-name');
        elementsTeamName.forEach(el => {
            el.textContent = usuarioLogado.team_name;
        });
        
        // Atualizar cartoletas
        const elementsCartoletas = document.querySelectorAll('#user-cartoletas, #user-cartoletas-card');
        elementsCartoletas.forEach(el => {
            el.textContent = `C$ ${parseFloat(usuarioLogado.cartoletas).toFixed(2)}`;
        });
        
        // Atualizar pontos
        const elementPoints = document.getElementById('user-points');
        if (elementPoints) {
            elementPoints.textContent = usuarioLogado.total_points || 0;
        }
        
        // Atualizar rodadas (contar escalações)
        const { count, error } = await supabase
            .from('lineups')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', usuarioLogado.id);
        
        if (!error) {
            const elementRounds = document.getElementById('user-rounds');
            if (elementRounds) {
                elementRounds.textContent = count || 0;
            }
        }
        
        console.log('✅ Dados do usuário carregados');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados do usuário:', error);
    }
}

// ============================================
// CARREGAR RANKING GERAL
// ============================================

async function carregarRanking() {
    try {
        console.log('🏆 Carregando ranking...');
        
        const { data: ranking, error } = await supabase
            .from('users')
            .select('id, team_name, total_points, cartoletas')
            .order('total_points', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        const tbody = document.getElementById('ranking-tbody');
        if (!tbody) return;
        
        if (!ranking || ranking.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-4 py-8 text-center text-gray-500">
                        Nenhum time cadastrado ainda
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = ranking.map((user, index) => {
            const posicao = index + 1;
            const isUsuarioAtual = user.id === usuarioLogado.id;
            const destaque = isUsuarioAtual ? 'bg-blue-50 dark:bg-blue-900' : '';
            
            // Atualizar posição do usuário
            if (isUsuarioAtual) {
                const elementPosition = document.getElementById('user-position');
                if (elementPosition) {
                    elementPosition.textContent = `${posicao}º`;
                }
            }
            
            // Medal icons for top 3
            let positionDisplay = `${posicao}º`;
            if (posicao === 1) positionDisplay = '🥇';
            else if (posicao === 2) positionDisplay = '🥈';
            else if (posicao === 3) positionDisplay = '🥉';
            
            return `
                <tr class="${destaque}">
                    <td class="px-4 py-3 whitespace-nowrap">
                        <span class="font-bold text-lg">${positionDisplay}</span>
                    </td>
                    <td class="px-4 py-3">
                        <span class="font-semibold ${isUsuarioAtual ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}">
                            ${user.team_name}
                            ${isUsuarioAtual ? ' <span class="text-xs">(Você)</span>' : ''}
                        </span>
                    </td>
                    <td class="px-4 py-3">
                        <span class="font-bold text-green-600 dark:text-green-400">${user.total_points || 0}</span>
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-300">
                        C$ ${parseFloat(user.cartoletas).toFixed(2)}
                    </td>
                </tr>
            `;
        }).join('');
        
        console.log('✅ Ranking carregado:', ranking.length, 'times');
        
    } catch (error) {
        console.error('❌ Erro ao carregar ranking:', error);
        const tbody = document.getElementById('ranking-tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-4 py-8 text-center text-red-500">
                        Erro ao carregar ranking
                    </td>
                </tr>
            `;
        }
    }
}

// ============================================
// CARREGAR HISTÓRICO DE ESCALAÇÕES
// ============================================

async function carregarHistorico() {
    try {
        console.log('📈 Carregando histórico...');
        
        const { data: escalacoes, error } = await supabase
            .from('lineups')
            .select(`
                id,
                round_id,
                total_points,
                created_at,
                rounds (name, status)
            `)
            .eq('user_id', usuarioLogado.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const container = document.getElementById('historico-lista');
        if (!container) return;
        
        if (!escalacoes || escalacoes.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p class="mb-2">📋 Você ainda não criou nenhuma escalação</p>
                    <a href="mercado.html" class="text-blue-600 hover:underline">
                        Crie sua primeira escalação →
                    </a>
                </div>
            `;
            return;
        }
        
        container.innerHTML = escalacoes.map(escalacao => {
            const data = new Date(escalacao.created_at).toLocaleDateString('pt-BR');
            const rodadaNome = escalacao.rounds?.name || 'Rodada';
            const status = escalacao.rounds?.status || 'unknown';
            
            let statusBadge = '';
            if (status === 'active') {
                statusBadge = '<span class="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">⚡ Em Andamento</span>';
            } else if (status === 'finished') {
                statusBadge = '<span class="ml-2 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded">✓ Finalizada</span>';
            }
            
            return `
                <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <div class="flex-1">
                        <p class="font-semibold text-gray-900 dark:text-white">
                            ${rodadaNome}
                            ${statusBadge}
                        </p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">${data}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-2xl font-bold text-green-600 dark:text-green-400">${escalacao.total_points || 0}</p>
                        <p class="text-xs text-gray-500">pontos</p>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('✅ Histórico carregado:', escalacoes.length, 'escalações');
        
    } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error);
        const container = document.getElementById('historico-lista');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    Erro ao carregar histórico
                </div>
            `;
        }
    }
}

// ============================================
// ATUALIZAR DADOS PERIODICAMENTE
// ============================================

// Atualizar ranking a cada 30 segundos
setInterval(() => {
    if (usuarioLogado) {
        carregarRanking();
        carregarDadosUsuario();
    }
}, 30000);