// assets/js/mercado.js

let usuarioLogado = null;
let jogadoresDisponiveis = [];
let saldoAtual = 40.00; // Saldo para futsal

// Estrutura da escalação para FUTSAL
let escalacaoAtual = {
    'GOL': null,
    'FIX': null,
    'ALA': [null, null], // 2 alas
    'PIV': null
};

// Limites de formação FUTSAL
const FORMACAO_LIMITES = {
    'GOL': 1,
    'FIX': 1,
    'ALA': 2,
    'PIV': 1
};

// ============================================
// FUNÇÕES UTILITÁRIAS (devem estar no início)
// ============================================

// Obter cor do badge da posição
function getCorPosicao(posicao) {
    const cores = {
        'GOL': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'FIX': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'ALA': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'PIV': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    return cores[posicao] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
}

// Obter cor do círculo da posição
function getCorCirculo(posicao) {
    const cores = {
        'GOL': 'bg-yellow-500',
        'FIX': 'bg-blue-500',
        'ALA': 'bg-green-500',
        'PIV': 'bg-red-500'
    };
    return cores[posicao] || 'bg-gray-500';
}

// Obter cor gradiente da posição
function getCorGradiente(posicao) {
    const cores = {
        'GOL': 'from-yellow-400 to-yellow-600',
        'FIX': 'from-blue-400 to-blue-600',
        'ALA': 'from-green-400 to-green-600',
        'PIV': 'from-red-400 to-red-600'
    };
    return cores[posicao] || 'from-gray-400 to-gray-600';
}

// Mostrar mensagem de notificação
function mostrarMensagem(mensagem, tipo = 'info') {
    console.log(`${tipo.toUpperCase()}: ${mensagem}`);
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 ${
        tipo === 'success' ? 'bg-green-500 text-white' :
        tipo === 'error' ? 'bg-red-500 text-white' :
        tipo === 'warning' ? 'bg-yellow-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = mensagem;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
// Aguarda o DOM carregar
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando mercado de futsal...');
    
    // Verificar autenticação
    usuarioLogado = await verificarAutenticacao();
    if (!usuarioLogado) {
        window.location.href = 'index.html';
        return;
    }

    await inicializarMercado();
});

// Inicializar o mercado
async function inicializarMercado() {
    try {
        console.log('⚙️ Carregando dados do mercado de futsal...');
        
        // ✅ VERIFICAR SE HÁ RODADA ATIVA ANTES DE TUDO
        await verificarStatusMercado();
        
        if (!mercadoAberto) {
            mostrarMercadoFechado();
            return; // Não carrega nada se mercado estiver fechado
        }
        
        // Carregar saldo atual do usuário
        await carregarSaldoUsuario();
        
        // Carregar jogadores disponíveis
        await carregarJogadores();
        
        // Carregar escalação atual (se existir)
        await carregarEscalacaoAtual();
        
        // Preencher filtro de times
        preencherFiltroTimes();
        
        // Configurar filtros e busca
        configurarFiltros();
        
        // Atualizar displays
        atualizarDisplaySaldo();
        renderizarJogadores();
        renderizarEscalacao();
        
        console.log('✅ Mercado de futsal inicializado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar mercado:', error);
        mostrarMensagem('Erro ao carregar o mercado', 'error');
    }
}
// ============================================
// ADICIONE no mercado.js após inicializarMercado
// ============================================

// Verificar se o mercado está aberto
let mercadoAberto = true;

async function verificarStatusMercado() {
    try {
        // Buscar rodada ativa
        const { data: rodadaAtiva, error } = await supabase
            .from('rounds')
            .select('id, name, status')
            .eq('status', 'active')
            .single();
        
        if (error && error.code !== 'PGRST116') {
            console.error('Erro ao verificar rodada:', error);
        }
        
        if (rodadaAtiva) {
            console.log('🔒 Rodada ativa encontrada:', rodadaAtiva.name);
            mercadoAberto = false;
            return false;
        } else {
            console.log('✅ Nenhuma rodada ativa - Mercado aberto');
            mercadoAberto = true;
            return true;
        }
        
    } catch (error) {
        console.error('Erro ao verificar status do mercado:', error);
        mercadoAberto = true; // Em caso de erro, deixar aberto
        return true;
    }
}
// Mostrar mensagem de mercado fechado
function mostrarMercadoFechado() {
    const container = document.querySelector('.max-w-7xl');
    if (!container) return;
    
    container.innerHTML = `
        <div class="min-h-screen flex items-center justify-center">
            <div class="max-w-2xl mx-auto text-center px-4">
                <!-- Ícone de bloqueio -->
                <div class="mb-8">
                    <div class="inline-block p-6 bg-red-100 dark:bg-red-900 rounded-full">
                        <svg class="w-24 h-24 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                    </div>
                </div>
                
                <!-- Título -->
                <h1 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                    🔒 Mercado Fechado
                </h1>
                
                <!-- Mensagem -->
                <div class="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-6 mb-8">
                    <p class="text-lg text-gray-700 dark:text-gray-300 mb-2">
                        <strong>Há uma rodada em andamento!</strong>
                    </p>
                    <p class="text-gray-600 dark:text-gray-400">
                        O mercado está temporariamente fechado durante as partidas.<br>
                        Você poderá fazer alterações na sua escalação assim que a rodada for finalizada.
                    </p>
                </div>
                
                <!-- Informações -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div class="text-3xl mb-2">⚽</div>
                        <h3 class="font-semibold text-gray-900 dark:text-white mb-2">Acompanhe os Jogos</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            Veja como seus jogadores estão se saindo em tempo real
                        </p>
                    </div>
                    
                    <div class="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                        <div class="text-3xl mb-2">📊</div>
                        <h3 class="font-semibold text-gray-900 dark:text-white mb-2">Pontuação ao Vivo</h3>
                        <p class="text-sm text-gray-600 dark:text-gray-400">
                            Os pontos são atualizados conforme as estatísticas
                        </p>
                    </div>
                </div>
                
                <!-- Botões de ação -->
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <a href="dashboard.html" class="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                        </svg>
                        Ver Dashboard
                    </a>
                    
                    <button onclick="location.reload()" class="inline-flex items-center justify-center px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        Atualizar Página
                    </button>
                </div>
                
                <!-- Dica -->
                <div class="mt-8 text-sm text-gray-500 dark:text-gray-400">
                    <p>💡 <strong>Dica:</strong> Fique de olho no ranking para ver como está sua colocação!</p>
                </div>
            </div>
        </div>
    `;
}

// ============================================
// MODIFIQUE a função inicializarMercado para incluir verificação
// ============================================

async function inicializarMercado() {
    try {
        console.log('⚙️ Carregando dados do mercado de futsal...');
        await verificarStatusMercado();
    atualizarBadgeMercado();
        // Verificar status do mercado
        const mercadoEstaAberto = await verificarStatusMercado();
        
        // Carregar saldo atual do usuário
        await carregarSaldoUsuario();
        
        // Carregar jogadores disponíveis
        await carregarJogadores();
        
        // Carregar escalação atual (se existir)
        await carregarEscalacaoAtual();
        
        // Preencher filtro de times
        preencherFiltroTimes();
        
        // Configurar filtros e busca
        configurarFiltros();
        
        // Atualizar displays
        atualizarDisplaySaldo();
        
        if (mercadoEstaAberto) {
            renderizarJogadores();
        }
        
        renderizarEscalacao();
        
        console.log('✅ Mercado de futsal inicializado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao inicializar mercado:', error);
        mostrarMensagem('Erro ao carregar o mercado', 'error');
    }
}

// ============================================
// MODIFIQUE as funções de adicionar/remover para verificar mercado
// ============================================

function adicionarJogador(jogadorId, ehTitular) {
    if (!mercadoAberto) {
        mostrarMensagem('Mercado fechado! Aguarde o fim da rodada.', 'error');
        return;
    }

function removerJogador(jogadorId) {
    // Verificar se mercado está aberto
    if (!mercadoAberto) {
        mostrarMensagem('O mercado está fechado!', 'error');
        return;
    }
    
    // ... resto do código original ...
}

// Carregar saldo atual do usuário
async function carregarSaldoUsuario() {
    const { data, error } = await supabase
        .from('users')
        .select('cartoletas')
        .eq('id', usuarioLogado.id)
        .single();
    
    if (error) {
        console.error('❌ Erro ao carregar saldo:', error);
        return;
    }
    
    saldoAtual = parseFloat(data.cartoletas) || 40.00;
    console.log(`💰 Saldo atual: C$ ${saldoAtual.toFixed(2)}`);
}

// Carregar jogadores disponíveis
async function carregarJogadores() {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('position', { ascending: true })
        .order('price', { ascending: true });
    
    if (error) {
        console.error('❌ Erro ao carregar jogadores:', error);
        return;
    }
    
    jogadoresDisponiveis = data || [];
    console.log(`👥 ${jogadoresDisponiveis.length} jogadores carregados`);
}

// Preencher filtro de times
function preencherFiltroTimes() {
    const selectTime = document.getElementById('filtro-time');
    if (!selectTime) return;
    
    const times = [...new Set(jogadoresDisponiveis.map(j => j.team))].sort();
    
    selectTime.innerHTML = `
        <option value="todos">Todos os times</option>
        ${times.map(time => `<option value="${time}">${time}</option>`).join('')}
    `;
}

// Carregar escalação atual do usuário
// SUBSTITUA a função carregarEscalacaoAtual no mercado.js
async function carregarEscalacaoAtual() {
    try {
        console.log('🔍 Carregando escalação existente...');
        
        // Buscar rodada ativa
        const { data: rodadaAtiva, error: rodadaError } = await supabase
            .from('rounds')
            .select('id, status')
            .eq('status', 'active')
            .maybeSingle();
        
        if (rodadaError) {
            console.error('❌ Erro ao buscar rodada:', rodadaError);
            return;
        }
        
        if (!rodadaAtiva) {
            console.log('ℹ️ Nenhuma rodada ativa encontrada');
            return;
        }
        
        console.log('✅ Rodada ativa:', rodadaAtiva.id);
        
        // Buscar escalação
        const { data: lineup, error: lineupError } = await supabase
            .from('lineups')
            .select('id')
            .eq('user_id', usuarioLogado.id)
            .eq('round_id', rodadaAtiva.id)
            .maybeSingle();
        
        if (lineupError) {
            console.error('❌ Erro ao buscar lineup:', lineupError);
            return;
        }
        
        if (!lineup) {
            console.log('ℹ️ Nenhuma escalação encontrada para esta rodada');
            return;
        }
        
        console.log('✅ Lineup encontrado:', lineup.id);
        
        // Buscar jogadores da escalação
        const { data: lineupPlayers, error: playersError } = await supabase
            .from('lineup_players')
            .select('player_id, is_starter')
            .eq('lineup_id', lineup.id);
        
        if (playersError) {
            console.error('❌ Erro ao buscar lineup_players:', playersError);
            return;
        }
        
        if (!lineupPlayers || lineupPlayers.length === 0) {
            console.log('ℹ️ Escalação sem jogadores');
            return;
        }
        
        console.log('✅ Jogadores encontrados:', lineupPlayers.length);
        
        // Buscar informações dos jogadores
        const playerIds = lineupPlayers.map(lp => lp.player_id);
        
        const { data: players, error: allPlayersError } = await supabase
            .from('players')
            .select('*')
            .in('id', playerIds);
        
        if (allPlayersError) {
            console.error('❌ Erro ao buscar players:', allPlayersError);
            return;
        }
        
        // Criar mapa de jogadores
        const playersMap = {};
        players.forEach(player => {
            playersMap[player.id] = player;
        });
        
        // Resetar e reconstruir escalação
        resetarEscalacao();
        
        lineupPlayers.forEach(lp => {
            const jogador = playersMap[lp.player_id];
            if (!jogador) return;
            
            const posicao = jogador.position;
            const ehTitular = lp.is_starter;
            
            if (ehTitular) {
                // Adicionar titulares
                if (posicao === 'ALA') {
                    if (escalacaoAtual.titulares.ALA[0] === null) {
                        escalacaoAtual.titulares.ALA[0] = jogador;
                    } else if (escalacaoAtual.titulares.ALA[1] === null) {
                        escalacaoAtual.titulares.ALA[1] = jogador;
                    }
                } else {
                    escalacaoAtual.titulares[posicao] = jogador;
                }
            } else {
                // Adicionar reservas
                if (posicao === 'ALA') {
                    if (escalacaoAtual.reservas.ALA[0] === null) {
                        escalacaoAtual.reservas.ALA[0] = jogador;
                    } else if (escalacaoAtual.reservas.ALA[1] === null) {
                        escalacaoAtual.reservas.ALA[1] = jogador;
                    }
                } else {
                    escalacaoAtual.reservas[posicao] = jogador;
                }
            }
        });
        
        console.log('✅ Escalação carregada com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao carregar escalação:', error);
        resetarEscalacao();
    }
}
// Função para carregar escalação existente do usuário
async function carregarEscalacaoExistente() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.error('Usuário não autenticado');
            return;
        }

        console.log('🔍 Buscando escalação para usuário:', user.id);

        // Buscar rodada ativa
        const { data: rodadaAtiva, error: rodadaError } = await supabase
            .from('rounds')
            .select('*')
            .eq('status', 'active')
            .maybeSingle(); // Usar maybeSingle em vez de single para não dar erro se não existir

        if (rodadaError) {
            console.error('Erro ao buscar rodada ativa:', rodadaError);
            return;
        }

        if (!rodadaAtiva) {
            console.log('ℹ️ Nenhuma rodada ativa encontrada');
            return;
        }

        console.log('✅ Rodada ativa encontrada:', rodadaAtiva.name);

        // Buscar escalação do usuário para a rodada ativa
        const { data: lineup, error: lineupError } = await supabase
            .from('lineups')
            .select('*')
            .eq('user_id', user.id)
            .eq('round_id', rodadaAtiva.id)
            .maybeSingle();

        if (lineupError) {
            console.error('Erro ao buscar lineup:', lineupError);
            return;
        }

        if (!lineup) {
            console.log('ℹ️ Nenhuma escalação encontrada para esta rodada');
            return;
        }

        console.log('✅ Escalação encontrada:', lineup.id);

        // Buscar os jogadores da escalação
        const { data: lineupPlayers, error: playersError } = await supabase
            .from('lineup_players')
            .select('*')
            .eq('lineup_id', lineup.id);

        if (playersError) {
            console.error('❌ Erro ao buscar jogadores da escalação:', playersError);
            return;
        }

        if (!lineupPlayers || lineupPlayers.length === 0) {
            console.log('ℹ️ Escalação sem jogadores');
            return;
        }

        console.log('✅ Jogadores da escalação:', lineupPlayers.length);

        // Buscar informações completas dos jogadores
        const playerIds = lineupPlayers.map(lp => lp.player_id);
        
        const { data: players, error: allPlayersError } = await supabase
            .from('players')
            .select('*')
            .in('id', playerIds);

        if (allPlayersError) {
            console.error('❌ Erro ao buscar informações dos jogadores:', allPlayersError);
            return;
        }

        console.log('✅ Informações dos jogadores carregadas:', players.length);

        // Criar um mapa de jogadores para acesso rápido
        const playersMap = {};
        players.forEach(player => {
            playersMap[player.id] = player;
        });

        // Reconstruir a escalação
        escalacao = {
            GOL: null,
            FIX: null,
            ALA1: null,
            ALA2: null,
            PIV: null,
            reservas: []
        };

        lineupPlayers.forEach(lp => {
            const player = playersMap[lp.player_id];
            if (!player) {
                console.warn('⚠️ Jogador não encontrado:', lp.player_id);
                return;
            }

            if (lp.is_starter) {
                // Jogador titular
                switch (player.position) {
                    case 'GOL':
                        escalacao.GOL = player;
                        break;
                    case 'FIX':
                        escalacao.FIX = player;
                        break;
                    case 'ALA':
                        if (!escalacao.ALA1) {
                            escalacao.ALA1 = player;
                        } else if (!escalacao.ALA2) {
                            escalacao.ALA2 = player;
                        }
                        break;
                    case 'PIV':
                        escalacao.PIV = player;
                        break;
                }
            } else {
                // Jogador reserva
                escalacao.reservas.push(player);
            }
        });

        // Atualizar a interface
        atualizarEscalacao();
        calcularCustos();

        console.log('✅ Escalação carregada com sucesso!');
        console.log('Titulares:', {
            GOL: escalacao.GOL?.name,
            FIX: escalacao.FIX?.name,
            ALA1: escalacao.ALA1?.name,
            ALA2: escalacao.ALA2?.name,
            PIV: escalacao.PIV?.name
        });
        console.log('Reservas:', escalacao.reservas.length);
        
    } catch (error) {
        console.error('❌ Erro ao carregar escalação:', error);
    }
}
// Resetar escalação
function resetarEscalacao() {
    escalacaoAtual = {
        'GOL': null,
        'FIX': null,
        'ALA': [null, null],
        'PIV': null
    };
}

// Configurar filtros e busca
function configurarFiltros() {
    // Filtro por posição
    const selectPosicao = document.getElementById('filtro-posicao');
    selectPosicao?.addEventListener('change', renderizarJogadores);
    
    // Filtro por time
    const selectTime = document.getElementById('filtro-time');
    selectTime?.addEventListener('change', renderizarJogadores);
    
    // Busca por nome
    const inputBusca = document.getElementById('busca-jogador');
    inputBusca?.addEventListener('input', renderizarJogadores);
    
    // Botão limpar escalação
    const btnLimpar = document.getElementById('btn-limpar-escalacao');
    btnLimpar?.addEventListener('click', limparEscalacao);
    
    // Botão salvar escalação
    const btnSalvar = document.getElementById('btn-salvar-escalacao');
    btnSalvar?.addEventListener('click', salvarEscalacao);
}

// Renderizar lista de jogadores
function renderizarJogadores() {
    const container = document.getElementById('lista-jogadores');
    if (!container) return;
    
    const jogadoresFiltrados = filtrarJogadores();
    
    if (jogadoresFiltrados.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Nenhum jogador encontrado</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = jogadoresFiltrados.map(jogador => {
        const jaEscalado = getStatusJogadorEscalacao(jogador.id);
        const podeAdicionar = podeAdicionarTitular(jogador.position);
        
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-all duration-200 hover:shadow-lg">
                <div class="flex items-center space-x-3">
                    <div class="w-12 h-12 bg-blue-500 ...
                        ${jogador.position}
                    </div>
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-900 dark:text-white">${jogador.name}</h4>
                        <p class="text-sm text-gray-600 dark:text-gray-300">${jogador.team}</p>
                    </div>
                    <div class="text-right">
                        <span class="inline-block px-2 py-1 text-xs font-medium rounded ${getCorPosicao(jogador.position)}">
                            ${jogador.position}
                        </span>
                        <p class="font-bold text-green-600 dark:text-green-400 mt-1">
                            C$ ${parseFloat(jogador.price).toFixed(2)}
                        </p>
                    </div>
                </div>
                
                <div class="mt-3">
                    ${jaEscalado ? 
                        `<div class="flex items-center justify-between">
                            <span class="text-sm text-green-600 dark:text-green-400">
                                ✓ Escalado
                            </span>
                            <button onclick="removerJogador('${jogador.id}')"
                                    class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                                Remover
                            </button>
                        </div>` :
                        `${podeAdicionar ? 
                            `<button onclick="adicionarJogador('${jogador.id}')"
                                    class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
                                Adicionar
                            </button>` :
                            `<button disabled class="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded text-sm cursor-not-allowed">
                                Posição preenchida
                            </button>`
                        }`
                    }
                </div>
            </div>
        `;
    }).join('');
}


// Filtrar jogadores
function filtrarJogadores() {
    let jogadoresFiltrados = [...jogadoresDisponiveis];
    
    const posicaoSelecionada = document.getElementById('filtro-posicao')?.value;
    if (posicaoSelecionada && posicaoSelecionada !== 'todas') {
        jogadoresFiltrados = jogadoresFiltrados.filter(j => j.position === posicaoSelecionada);
    }
    
    const timeSelecionado = document.getElementById('filtro-time')?.value;
    if (timeSelecionado && timeSelecionado !== 'todos') {
        jogadoresFiltrados = jogadoresFiltrados.filter(j => j.team === timeSelecionado);
    }
    
    const termoBusca = document.getElementById('busca-jogador')?.value.toLowerCase();
    if (termoBusca) {
        jogadoresFiltrados = jogadoresFiltrados.filter(j => 
            j.name.toLowerCase().includes(termoBusca)
        );
    }
    
    return jogadoresFiltrados;
}

// Renderizar escalação (quadrinha + reservas)
function renderizarEscalacao() {
    const container = document.getElementById('escalacao-atual');
    if (!container) return;
    
    container.innerHTML = `
        <!-- Quadrinha Titulares -->
        <div class="bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-6 shadow-lg">
            <h3 class="text-xl font-bold text-white mb-6 text-center">
                ⚽ SUA ESCALAÇÃO
            </h3>
            
            <!-- Campo de Futsal -->
            <div class="relative bg-green-300/30 backdrop-blur-sm rounded-lg p-6 min-h-[350px] border-2 border-white/50">
                
                <!-- Goleiro -->
                <div class="absolute bottom-6 left-1/2 transform -translate-x-1/2">
                    ${renderizarPosicaoJogador(escalacaoAtual.GOL, 'GOL')}
                </div>
                
                <!-- Fixo -->
                <div class="absolute bottom-20 left-1/2 transform -translate-x-1/2">
                    ${renderizarPosicaoJogador(escalacaoAtual.FIX, 'FIX')}
                </div>
                
                <!-- Alas -->
                <div class="absolute top-1/2 left-6 transform -translate-y-1/2">
                    ${renderizarPosicaoJogador(escalacaoAtual.ALA[0], 'ALA', 0)}
                </div>
                <div class="absolute top-1/2 right-6 transform -translate-y-1/2">
                    ${renderizarPosicaoJogador(escalacaoAtual.ALA[1], 'ALA', 1)}
                </div>
                
                <!-- Pivô -->
                <div class="absolute top-6 left-1/2 transform -translate-x-1/2">
                    ${renderizarPosicaoJogador(escalacaoAtual.PIV, 'PIV')}
                </div>
                
            </div>
        </div>
        
        <!-- Resumo da Escalação -->
        <div class="mt-6 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div id="resumo-escalacao"></div>
        </div>
    `;
    
    atualizarResumoEscalacao();
}

// Função para obter ícone da posição
function getIconePosicao(posicao) {
    const icones = {
        'GOL': '🧤',
        'FIX': '🛡️',
        'ALA': '⚡',
        'PIV': '🎯'
    };
    return icones[posicao] || '⚽';
}

// Renderizar jogador em uma posição (para a quadrinha)
function renderizarPosicaoJogador(jogador, posicao, indiceAla = null) {
    if (!jogador) {
        return `
            <div class="w-20 h-20 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-full border-2 border-dashed border-white flex items-center justify-center shadow-md">
                <span class="text-sm text-gray-600 dark:text-gray-400 font-bold">${posicao}</span>
            </div>
        `;
    }
    
    const corGradiente = getCorGradiente(jogador.position);
    
    return `
        <div class="relative group">
            <div class="w-20 h-20 bg-gradient-to-br ${corGradiente} rounded-full border-4 border-white shadow-xl cursor-pointer hover:scale-110 transition-all flex items-center justify-center"
                 title="${jogador.name} - ${jogador.team} - C$ ${parseFloat(jogador.price).toFixed(2)}">
                <span class="text-lg font-bold text-white">${jogador.position}</span>
            </div>
            <div class="absolute -top-2 -right-2">
                <button onclick="removerJogador('${jogador.id}')" 
                        class="w-7 h-7 bg-red-500 text-white rounded-full text-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-bold shadow-lg">
                    ×
                </button>
            </div>
            <div class="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                <span class="text-sm bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-md text-gray-800 dark:text-gray-200 font-semibold border border-gray-200 dark:border-gray-700">
                    ${jogador.name.split(' ')[0]}
                </span>
            </div>
        </div>
    `;
}




// Verificar se pode adicionar titular
function podeAdicionarTitular(posicao) {
    if (posicao === 'ALA') {
        return escalacaoAtual.ALA[0] === null || escalacaoAtual.ALA[1] === null;
    }
    return escalacaoAtual[posicao] === null;
}

// Obter status do jogador na escalação
function getStatusJogadorEscalacao(jogadorId) {
    if (escalacaoAtual.GOL?.id === jogadorId) return true;
    if (escalacaoAtual.FIX?.id === jogadorId) return true;
    if (escalacaoAtual.ALA[0]?.id === jogadorId) return true;
    if (escalacaoAtual.ALA[1]?.id === jogadorId) return true;
    if (escalacaoAtual.PIV?.id === jogadorId) return true;
    return false;
}

function adicionarJogador(jogadorId) {
    const jogador = jogadoresDisponiveis.find(j => j.id === jogadorId);
    if (!jogador) return;
    
    const posicao = jogador.position;
    
    // Verificar saldo
    const custoTotal = calcularCustoEscalacao() + parseFloat(jogador.price);
    if (custoTotal > saldoAtual) {
        mostrarMensagem('Saldo insuficiente', 'error');
        return;
    }
    
    // Verificar se pode adicionar
    if (!podeAdicionarTitular(posicao)) {
        mostrarMensagem(`Posição ${posicao} já preenchida`, 'error');
        return;
    }
    
    // Adicionar jogador
    if (posicao === 'ALA') {
        if (escalacaoAtual.ALA[0] === null) {
            escalacaoAtual.ALA[0] = jogador;
        } else {
            escalacaoAtual.ALA[1] = jogador;
        }
    } else {
        escalacaoAtual[posicao] = jogador;
    }
    
    mostrarMensagem(`${jogador.name} adicionado à escalação`, 'success');
    
    // Atualizar displays
    renderizarJogadores();
    renderizarEscalacao();
}
// Remover jogador da escalação
function removerJogador(jogadorId) {
    if (!mercadoAberto) {
        mostrarMensagem('Mercado fechado! Aguarde o fim da rodada.', 'error');
        return;
    }
    let jogadorRemovido = null;
    
    // Buscar e remover
    Object.keys(escalacaoAtual).forEach(posicao => {
        if (posicao === 'ALA') {
            escalacaoAtual.ALA.forEach((jogador, index) => {
                if (jogador?.id === jogadorId) {
                    jogadorRemovido = jogador;
                    escalacaoAtual.ALA[index] = null;
                }
            });
        } else {
            if (escalacaoAtual[posicao]?.id === jogadorId) {
                jogadorRemovido = escalacaoAtual[posicao];
                escalacaoAtual[posicao] = null;
            }
        }
    });
    
    if (jogadorRemovido) {
        mostrarMensagem(`${jogadorRemovido.name} removido da escalação`, 'success');
        renderizarJogadores();
        renderizarEscalacao();
    }
}


// ... (código anterior continua igual até calcularCustoEscalacao)

function calcularCustoEscalacao() {
    let total = 0;
    
    if (escalacaoAtual.GOL) total += parseFloat(escalacaoAtual.GOL.price);
    if (escalacaoAtual.FIX) total += parseFloat(escalacaoAtual.FIX.price);
    if (escalacaoAtual.PIV) total += parseFloat(escalacaoAtual.PIV.price);
    
    escalacaoAtual.ALA.forEach(jogador => {
        if (jogador) total += parseFloat(jogador.price);
    });
    
    return total;
}

// Atualizar display do saldo
function atualizarDisplaySaldo() {
    const custoAtual = calcularCustoEscalacao();
    const saldoRestante = saldoAtual - custoAtual;
    
    const elementoSaldo = document.getElementById('saldo-atual');
    const elementoCusto = document.getElementById('custo-escalacao');
    const elementoRestante = document.getElementById('saldo-restante');
    
    if (elementoSaldo) {
        elementoSaldo.textContent = `C$ ${saldoAtual.toFixed(2)}`;
    }
    
    if (elementoCusto) {
        elementoCusto.textContent = `C$ ${custoAtual.toFixed(2)}`;
    }
    
    if (elementoRestante) {
        elementoRestante.textContent = `C$ ${saldoRestante.toFixed(2)}`;
        elementoRestante.className = saldoRestante >= 0 ? 
            'text-green-600 dark:text-green-400 font-semibold' : 
            'text-red-600 dark:text-red-400 font-semibold';
    }
}

// Atualizar resumo da escalação
function atualizarResumoEscalacao() {
    const resumo = document.getElementById('resumo-escalacao');
    if (!resumo) return;
    
    const contadores = {
        GOL: escalacaoAtual.GOL ? 1 : 0,
        FIX: escalacaoAtual.FIX ? 1 : 0,
        ALA: escalacaoAtual.ALA.filter(j => j !== null).length,
        PIV: escalacaoAtual.PIV ? 1 : 0
    };
    
    const totalJogadores = Object.values(contadores).reduce((a, b) => a + b, 0);
    const escalacaoCompleta = totalJogadores === 5;
    
    resumo.innerHTML = `
        <div class="text-center">
            <div class="grid grid-cols-4 gap-4 mb-4">
                <div class="text-center">
                    <div class="text-2xl font-bold ${contadores.GOL === 1 ? 'text-green-600' : 'text-red-600'}">${contadores.GOL}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">GOL</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold ${contadores.FIX === 1 ? 'text-green-600' : 'text-red-600'}">${contadores.FIX}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">FIX</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold ${contadores.ALA === 2 ? 'text-green-600' : 'text-red-600'}">${contadores.ALA}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">ALA</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold ${contadores.PIV === 1 ? 'text-green-600' : 'text-red-600'}">${contadores.PIV}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">PIV</div>
                </div>
            </div>
            
            <div class="text-xl font-bold ${escalacaoCompleta ? 'text-green-600' : 'text-orange-600'} mb-2">
                ${totalJogadores}/5 jogadores
            </div>
            <div class="text-sm ${escalacaoCompleta ? 'text-green-600' : 'text-red-600'}">
                ${escalacaoCompleta ? '✅ Escalação completa!' : '⚠️ Complete sua escalação'}
            </div>
        </div>
    `;
    
    atualizarDisplaySaldo();
}

// Limpar escalação
function limparEscalacao() {
    const totalJogadores = calcularTotalJogadores();
    if (totalJogadores === 0) {
        mostrarMensagem('Escalação já está vazia', 'info');
        return;
    }
    
    if (confirm('Tem certeza que deseja limpar toda a escalação?')) {
        resetarEscalacao();
        renderizarJogadores();
        renderizarEscalacao();
        mostrarMensagem('Escalação limpa com sucesso', 'success');
    }
}

// Calcular total de jogadores na escalação
function calcularTotalJogadores() {
    let total = 0;
    if (escalacaoAtual.GOL) total++;
    if (escalacaoAtual.FIX) total++;
    if (escalacaoAtual.PIV) total++;
    total += escalacaoAtual.ALA.filter(j => j !== null).length;
    return total;
}

async function salvarEscalacao() {
    // ✅ VERIFICAR SE MERCADO AINDA ESTÁ ABERTO
    const mercadoEstaAberto = await verificarStatusMercado();
    if (!mercadoEstaAberto) {
        alert('⚠️ O mercado foi fechado! Uma rodada foi iniciada.');
        location.reload();
        return;
    }
    try {
        const totalJogadores = calcularTotalJogadores();
        
        if (totalJogadores !== 5) {
            mostrarMensagem('A escalação deve ter exatamente 5 jogadores', 'error');
            return;
        }
        
        // Verificar formação
        if (!escalacaoAtual.GOL || !escalacaoAtual.FIX || !escalacaoAtual.PIV || 
            escalacaoAtual.ALA.filter(j => j).length !== 2) {
            mostrarMensagem('Formação inválida (1 GOL, 1 FIX, 2 ALA, 1 PIV)', 'error');
            return;
        }
        
        if (calcularCustoEscalacao() > saldoAtual) {
            mostrarMensagem('Custo da escalação excede o saldo disponível', 'error');
            return;
        }
        
        // Buscar rodada ativa
        const { data: rodadaAtiva, error: errorRodada } = await supabase
            .from('rounds')
            .select('id')
            .eq('status', 'active')
            .single();
        
        if (errorRodada || !rodadaAtiva) {
            mostrarMensagem('Nenhuma rodada ativa encontrada', 'error');
            return;
        }
        
        // Verificar se já existe escalação
        const { data: escalacaoExistente } = await supabase
            .from('lineups')
            .select('id')
            .eq('user_id', usuarioLogado.id)
            .eq('round_id', rodadaAtiva.id)
            .single();
        
        let lineupId;
        
        if (escalacaoExistente) {
            lineupId = escalacaoExistente.id;
            
            // Deletar escalação anterior
            await supabase
                .from('lineup_players')
                .delete()
                .eq('lineup_id', lineupId);
        } else {
            // Criar nova escalação
            const { data: novaEscalacao, error: errorEscalacao } = await supabase
                .from('lineups')
                .insert({
                    user_id: usuarioLogado.id,
                    round_id: rodadaAtiva.id,
                    total_points: 0
                })
                .select('id')
                .single();
            
            if (errorEscalacao) throw errorEscalacao;
            lineupId = novaEscalacao.id;
        }
        
        // Preparar dados para inserir (APENAS TITULARES)
        const jogadoresParaInserir = [];
        
        if (escalacaoAtual.GOL) {
            jogadoresParaInserir.push({
                lineup_id: lineupId,
                player_id: escalacaoAtual.GOL.id,
                is_starter: true,
                points: 0
            });
        }
        
        if (escalacaoAtual.FIX) {
            jogadoresParaInserir.push({
                lineup_id: lineupId,
                player_id: escalacaoAtual.FIX.id,
                is_starter: true,
                points: 0
            });
        }
        
        escalacaoAtual.ALA.forEach(jogador => {
            if (jogador) {
                jogadoresParaInserir.push({
                    lineup_id: lineupId,
                    player_id: jogador.id,
                    is_starter: true,
                    points: 0
                });
            }
        });
        
        if (escalacaoAtual.PIV) {
            jogadoresParaInserir.push({
                lineup_id: lineupId,
                player_id: escalacaoAtual.PIV.id,
                is_starter: true,
                points: 0
            });
        }
        
        // Inserir jogadores
        const { error: errorJogadores } = await supabase
            .from('lineup_players')
            .insert(jogadoresParaInserir);
        
        if (errorJogadores) throw errorJogadores;
        
        // Atualizar saldo do usuário
        const novoSaldo = saldoAtual - calcularCustoEscalacao();
        const { error: errorSaldo } = await supabase
            .from('users')
            .update({ cartoletas: novoSaldo })
            .eq('id', usuarioLogado.id);
        
        if (errorSaldo) throw errorSaldo;
        
        saldoAtual = novoSaldo;
        
        console.log('✅ Escalação salva com sucesso!');
        mostrarMensagem('Escalação salva com sucesso!', 'success');
        
        atualizarDisplaySaldo();
        
    } catch (error) {
        console.error('❌ Erro ao salvar escalação:', error);
        mostrarMensagem('Erro ao salvar escalação', 'error');
    }
}
}
function atualizarBadgeMercado() {
    const badge = document.getElementById('status-mercado');
    if (!badge) return;
    
    if (mercadoAberto) {
        badge.className = 'ml-3 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        badge.innerHTML = '✅ Aberto';
    } else {
        badge.className = 'ml-3 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        badge.innerHTML = '🔒 Fechado';
    }
}
// ============================================
// AUTO-ATUALIZAÇÃO DE STATUS
// ============================================

// Verificar status do mercado a cada 30 segundos
setInterval(async () => {
    if (usuarioLogado) {
        const statusAnterior = mercadoAberto;
        await verificarStatusMercado();
        
        // Se o status mudou, recarregar a página
        if (statusAnterior !== mercadoAberto) {
            console.log('⚠️ Status do mercado mudou! Recarregando...');
            alert(mercadoAberto ? 
                '✅ Mercado reaberto! A rodada foi finalizada.' : 
                '🔒 Mercado fechado! Uma rodada foi iniciada.'
            );
            location.reload();
        }
        
        atualizarBadgeMercado();
    }
}, 30000); // 30 segundos