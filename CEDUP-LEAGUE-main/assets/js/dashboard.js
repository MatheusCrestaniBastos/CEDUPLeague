/**
 * CEDUP League - Dashboard
 * Exibição de ranking, estatísticas e histórico
 */

let supabaseClient;
let currentUser = null;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    supabaseClient = window.utils.supabase;
    
    if (!supabaseClient) {
        window.utils.showError("Erro de inicialização do Supabase. Verifique utils.js.");
        return;
    }

    // Verificar autenticação
    const authUser = await window.auth.checkAuthStatus();
    if (!authUser) return;
    
    // Obter dados completos do usuário
    currentUser = await window.utils.getUserData(authUser.id);

    // Renderizar navegação
    renderNavigation();

    // Carregar e renderizar dashboard
    await loadAndRenderDashboard();
});

// ============================================
// CARREGAMENTO DE DADOS
// ============================================

/**
 * Carrega todos os dados necessários para o dashboard
 */
async function loadAndRenderDashboard() {
    try {
        // Buscar dados em paralelo para otimizar performance
        const [rankingData, roundsData, lastRoundScouts, userLineups] = await Promise.all([
            getRanking(),
            getRounds(),
            getLastRoundTopScouts(),
            getUserLineups()
        ]);

        renderDashboard(rankingData, roundsData, lastRoundScouts, userLineups);

    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
        window.utils.showError('Erro ao carregar dados do dashboard.');
    }
}

/**
 * Busca o ranking geral
 */
async function getRanking() {
    const { data, error } = await supabaseClient
        .from('ranking_geral')
        .select('*')
        .limit(20);
    
    if (error) throw error;
    return data || [];
}

/**
 * Busca todas as rodadas
 */
async function getRounds() {
    const { data, error } = await supabaseClient
        .from('rounds')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

/**
 * Busca os top scouts da última rodada fechada
 */
async function getLastRoundTopScouts() {
    // Buscar última rodada fechada
    const { data: lastRound } = await supabaseClient
        .from('rounds')
        .select('id, name')
        .eq('status', 'fechada')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    
    if (!lastRound) return { round: null, scouts: [] };

    // Buscar top 10 scouts dessa rodada
    const { data: scouts, error } = await supabaseClient
        .from('scouts')
        .select(`
            id,
            points,
            goals,
            assists,
            player_id,
            players (
                name,
                position,
                team,
                photo_url
            )
        `)
        .eq('round_id', lastRound.id)
        .order('points', { ascending: false })
        .limit(10);
    
    if (error) throw error;

    return {
        round: lastRound,
        scouts: scouts || []
    };
}

/**
 * Busca as escalações do usuário em todas as rodadas
 */
async function getUserLineups() {
    const { data, error } = await supabaseClient
        .from('lineups')
        .select(`
            id,
            total_points,
            total_value,
            created_at,
            rounds (
                id,
                name,
                status
            )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
}

// ============================================
// RENDERIZAÇÃO
// ============================================

/**
 * Renderiza o dashboard completo
 */
function renderDashboard(ranking, rounds, lastRoundData, userLineups) {
    const container = document.getElementById('dashboard-container');
    
    if (!container) return;

    // Encontrar posição do usuário no ranking
    const userPosition = ranking.findIndex(r => r.id === currentUser.id) + 1;
    const userRankingData = ranking.find(r => r.id === currentUser.id);

    container.innerHTML = `
        <div x-data="dashboardComponent()" class="space-y-8">
            
            <!-- Cabeçalho com Estatísticas do Usuário -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <!-- Card: Posição no Ranking -->
                <div class="bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-lg shadow-xl p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm opacity-80">Sua Posição</p>
                            <p class="text-4xl font-bold mt-2">${userPosition > 0 ? userPosition + 'º' : '-'}</p>
                        </div>
                        <div class="text-5xl opacity-30">🏆</div>
                    </div>
                </div>

                <!-- Card: Pontos Totais -->
                <div class="bg-gradient-to-br from-green-500 to-green-700 text-white rounded-lg shadow-xl p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm opacity-80">Pontos Totais</p>
                            <p class="text-4xl font-bold mt-2">${window.utils.formatPoints(currentUser.total_points)}</p>
                        </div>
                        <div class="text-5xl opacity-30">⚡</div>
                    </div>
                </div>

                <!-- Card: Cartoletas -->
                <div class="bg-gradient-to-br from-yellow-500 to-yellow-700 text-white rounded-lg shadow-xl p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm opacity-80">Cartoletas</p>
                            <p class="text-3xl font-bold mt-2">${window.utils.formatCurrency(currentUser.cartoletas)}</p>
                        </div>
                        <div class="text-5xl opacity-30">💰</div>
                    </div>
                </div>

                <!-- Card: Rodadas Participadas -->
                <div class="bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-lg shadow-xl p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm opacity-80">Rodadas</p>
                            <p class="text-4xl font-bold mt-2">${userLineups.length}</p>
                        </div>
                        <div class="text-5xl opacity-30">📊</div>
                    </div>
                </div>
            </div>

            <!-- Grid Principal: Ranking + Destaques -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <!-- Coluna 1 e 2: Ranking Geral -->
                <div class="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                    <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
                        🏆 Ranking Geral
                    </h2>
                    
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pos.</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Time</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pontos</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cartoletas</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                ${ranking.map((user, index) => `
                                    <tr class="${user.id === currentUser.id ? 'bg-blue-50 dark:bg-blue-900/20 font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}">
                                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            ${index + 1 <= 3 ? 
                                                (index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉') : 
                                                (index + 1 + 'º')}
                                        </td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            ${user.team_name}
                                            ${user.id === currentUser.id ? '<span class="ml-2 text-xs text-blue-600 dark:text-blue-400">(Você)</span>' : ''}
                                        </td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                                            ${window.utils.formatPoints(user.total_points)}
                                        </td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            ${window.utils.formatCurrency(user.cartoletas)}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Coluna 3: Destaques da Última Rodada -->
                <div class="lg:col-span-1 space-y-6">
                    
                    <!-- Top Jogadores da Última Rodada -->
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                        <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center">
                            ⭐ Top Jogadores
                        </h3>
                        ${lastRoundData.round ? `
                            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${lastRoundData.round.name}</p>
                            <div class="space-y-3">
                                ${lastRoundData.scouts.slice(0, 5).map((scout, index) => `
                                    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                        <div class="flex items-center space-x-3">
                                            <span class="text-lg font-bold text-gray-400">${index + 1}</span>
                                            <div>
                                                <p class="text-sm font-semibold text-gray-900 dark:text-white">
                                                    ${scout.players.name}
                                                </p>
                                                <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                                    ${scout.players.position} - ${scout.players.team}
                                                </p>
                                            </div>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-lg font-bold text-green-600 dark:text-green-400">
                                                ${window.utils.formatPoints(scout.points)}
                                            </p>
                                            <p class="text-xs text-gray-500 dark:text-gray-400">
                                                ${scout.goals}G ${scout.assists}A
                                            </p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                                Nenhuma rodada fechada ainda.
                            </p>
                        `}
                    </div>

                    <!-- Status das Rodadas -->
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                        <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center">
                            📅 Rodadas
                        </h3>
                        <div class="space-y-2">
                            ${rounds.slice(0, 5).map(round => `
                                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div>
                                        <p class="text-sm font-semibold text-gray-900 dark:text-white">
                                            ${round.name}
                                        </p>
                                        <p class="text-xs text-gray-500 dark:text-gray-400">
                                            ${window.utils.formatDate(round.created_at)}
                                        </p>
                                    </div>
                                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${
                                        round.status === 'aberta' ? 
                                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                                        'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                                    }">
                                        ${round.status === 'aberta' ? 'Aberta' : 'Fechada'}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Histórico do Usuário -->
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
                <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center">
                    📈 Seu Histórico
                </h2>
                
                ${userLineups.length > 0 ? `
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rodada</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pontos</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Valor do Time</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                ${userLineups.map(lineup => `
                                    <tr class="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            ${lineup.rounds.name}
                                        </td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600 dark:text-green-400">
                                            ${window.utils.formatPoints(lineup.total_points)}
                                        </td>
                                        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            ${window.utils.formatCurrency(lineup.total_value)}
                                        </td>
                                        <td class="px-4 py-3 whitespace-nowrap">
                                            <span class="px-3 py-1 rounded-full text-xs font-semibold ${
                                                lineup.rounds.status === 'aberta' ? 
                                                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                                                'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                                            }">
                                                ${lineup.rounds.status === 'aberta' ? 'Aberta' : 'Fechada'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : `
                    <div class="text-center py-12">
                        <p class="text-gray-500 dark:text-gray-400 text-lg mb-4">
                            Você ainda não participou de nenhuma rodada.
                        </p>
                        <a href="mercado.html" class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors duration-200">
                            Montar Meu Time
                        </a>
                    </div>
                `}
            </div>

        </div>
    `;
}

/**
 * Componente Alpine.js para interatividade (se necessário no futuro)
 */
function dashboardComponent() {
    return {
        // Adicionar interatividade futura aqui
    };
}

/**
 * Renderiza a barra de navegação
 */
function renderNavigation() {
    const navContainer = document.querySelector('nav .container');
    if (!navContainer) return;
    
    if (document.getElementById('main-nav-links')) return;

    const navLinks = `
        <div class="flex justify-between items-center w-full">
            <div class="flex items-center space-x-6">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">🏆 CEDUP League</h1>
                <div id="main-nav-links" class="flex space-x-4 text-sm font-medium">
                    <a href="dashboard.html" class="text-blue-600 dark:text-blue-400 font-bold">Dashboard</a>
                    <a href="mercado.html" class="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">Mercado</a>
                    ${currentUser && currentUser.role === 'admin' ? 
                        `<a href="admin.html" class="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200">Admin</a>` : 
                        ''}
                </div>
            </div>
            
            <div class="flex items-center space-x-4">
                <div class="text-right text-sm">
                    <span class="block font-semibold text-gray-900 dark:text-white">${currentUser.team_name}</span>
                    <span class="block text-gray-500 dark:text-gray-400">${window.utils.formatCurrency(currentUser.cartoletas)}</span>
                </div>
                <div id="theme-toggle-container"></div>
                <button onclick="window.auth.logout()" class="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600" title="Sair">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </div>
    `;
    navContainer.innerHTML = navLinks;
    window.theme.createThemeToggleButton('theme-toggle-container');
}
/**
 * Dashboard - Carrega dados do usuário e ranking
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
    if (usuarioLogado.role === 'admin') {
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
            el.textContent = `C$ ${usuarioLogado.cartoletas.toFixed(2)}`;
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
            .order('total_points', { ascending: false });
        
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
            
            return `
                <tr class="${destaque}">
                    <td class="px-4 py-3 whitespace-nowrap">
                        <span class="font-bold">${posicao}º</span>
                    </td>
                    <td class="px-4 py-3">
                        <span class="font-semibold ${isUsuarioAtual ? 'text-blue-600' : 'text-gray-900 dark:text-white'}">
                            ${user.team_name}
                            ${isUsuarioAtual ? ' (Você)' : ''}
                        </span>
                    </td>
                    <td class="px-4 py-3">
                        <span class="font-bold text-green-600">${user.total_points || 0}</span>
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-300">
                        C$ ${user.cartoletas.toFixed(2)}
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

// Função para carregar o histórico de escalações
async function carregarHistorico() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.error('Usuário não autenticado');
            return;
        }

        // Buscar escalações do usuário
        const { data: lineups, error: lineupsError } = await supabase
            .from('lineups')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (lineupsError) {
            console.error('❌ Erro ao buscar escalações:', lineupsError);
            throw lineupsError;
        }

        if (!lineups || lineups.length === 0) {
            document.getElementById('historico-lista').innerHTML = `
                <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p class="text-lg">📋 Nenhuma escalação encontrada</p>
                    <p class="text-sm mt-2">Monte seu time no <a href="mercado.html" class="text-blue-600 hover:underline">Mercado</a></p>
                </div>
            `;
            return;
        }

        // Buscar todas as rodadas de uma vez
        const { data: rounds, error: roundsError } = await supabase
            .from('rounds')
            .select('*');

        if (roundsError) {
            console.error('❌ Erro ao buscar rodadas:', roundsError);
            throw roundsError;
        }

        // Criar um mapa de rodadas para acesso rápido
        const roundsMap = {};
        if (rounds) {
            rounds.forEach(round => {
                roundsMap[round.id] = round;
            });
        }

        // Montar o HTML do histórico
        const historicoHTML = lineups.map(lineup => {
            const round = roundsMap[lineup.round_id];
            const roundName = round ? round.name : 'Rodada desconhecida';
            const pontos = lineup.points || 0;
            const dataCriacao = new Date(lineup.created_at).toLocaleDateString('pt-BR');

            return `
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div class="flex justify-between items-center">
                        <div>
                            <h3 class="font-semibold text-gray-900 dark:text-white">${roundName}</h3>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Criado em: ${dataCriacao}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">${pontos} pts</p>
                            <button onclick="verDetalhesEscalacao('${lineup.id}')" 
                                    class="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                                Ver detalhes
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('historico-lista').innerHTML = historicoHTML;

    } catch (error) {
        console.error('❌ Erro ao carregar histórico:', error);
        document.getElementById('historico-lista').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <p>Erro ao carregar histórico</p>
                <p class="text-sm mt-2">${error.message}</p>
            </div>
        `;
    }
}

// Função para ver detalhes de uma escalação
async function verDetalhesEscalacao(lineupId) {
    try {
        const { data: lineup, error } = await supabase
            .from('lineups')
            .select('*')
            .eq('id', lineupId)
            .single();

        if (error) throw error;

        // Buscar informações da rodada
        const { data: round } = await supabase
            .from('rounds')
            .select('*')
            .eq('id', lineup.round_id)
            .single();

        // Montar modal com detalhes
        const modalHTML = `
            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onclick="fecharModal(event)">
                <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
                            ${round ? round.name : 'Detalhes da Escalação'}
                        </h2>
                        <button onclick="fecharModal()" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 class="font-semibold text-gray-900 dark:text-white mb-2">📊 Resumo</h3>
                            <p class="text-gray-700 dark:text-gray-300">Pontos: <span class="font-bold text-blue-600">${lineup.points || 0}</span></p>
                            <p class="text-gray-700 dark:text-gray-300">Capitão: <span class="font-bold">${lineup.captain_id || 'Não definido'}</span></p>
                        </div>
                        
                        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 class="font-semibold text-gray-900 dark:text-white mb-2">⚽ Escalação Completa</h3>
                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                Goleiro: ${lineup.goalkeeper_id || '-'}<br>
                                Fixo: ${lineup.defender_id || '-'}<br>
                                Ala 1: ${lineup.winger1_id || '-'}<br>
                                Ala 2: ${lineup.winger2_id || '-'}<br>
                                Pivô: ${lineup.pivot_id || '-'}
                            </p>
                        </div>
                        
                        ${lineup.reserve1_id || lineup.reserve2_id || lineup.reserve3_id ? `
                        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <h3 class="font-semibold text-gray-900 dark:text-white mb-2">🔄 Reservas</h3>
                            <p class="text-sm text-gray-600 dark:text-gray-400">
                                ${lineup.reserve1_id ? `Reserva 1: ${lineup.reserve1_id}<br>` : ''}
                                ${lineup.reserve2_id ? `Reserva 2: ${lineup.reserve2_id}<br>` : ''}
                                ${lineup.reserve3_id ? `Reserva 3: ${lineup.reserve3_id}` : ''}
                            </p>
                        </div>
                        ` : ''}
                    </div>
                    
                    <button onclick="fecharModal()" 
                            class="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                        Fechar
                    </button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

    } catch (error) {
        console.error('❌ Erro ao buscar detalhes:', error);
        alert('Erro ao carregar detalhes da escalação');
    }
}

// Função para fechar o modal
function fecharModal(event) {
    if (!event || event.target === event.currentTarget) {
        const modal = document.querySelector('.fixed.inset-0');
        if (modal) {
            modal.remove();
        }
    }
}

// Garantir que a função seja chamada quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    carregarHistorico();
});

// ============================================
// ATUALIZAR DADOS PERIODICAMENTE
// ============================================

// Atualizar ranking a cada 30 segundos
setInterval(() => {
    if (usuarioLogado) {
        carregarRanking();
    }
}, 30000);