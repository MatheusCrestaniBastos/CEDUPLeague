// assets/js/admin.js

// Verificação de autenticação e permissões admin
document.addEventListener('DOMContentLoaded', async function() {
    await verificarAutenticacao();  // ← ERA checkAuth, agora é verificarAutenticacao
    await verificarAdmin();
    initializeAdmin();
});

// Função de verificar autenticação (ADICIONE se não existir)
async function verificarAutenticacao() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            console.log('❌ Usuário não autenticado');
            window.location.href = 'login.html';
            return null;
        }
        
        // Buscar dados do usuário na tabela users
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
            
        if (userError) {
            console.error('Erro ao buscar dados do usuário:', userError);
            return null;
        }
        
        console.log('✅ Usuário autenticado:', userData);
        return userData;
        
    } catch (error) {
        console.error('Erro na verificação de autenticação:', error);
        window.location.href = 'login.html';
        return null;
    }
}

// No início do admin.js, após verificarAutenticacao()

async function verificarPermissaoAdmin() {
    const { data: userData, error } = await supabase
        .from('users')
        .select('is_admin, role')
        .eq('id', (await supabase.auth.getUser()).data.user.id)
        .single();
    
    if (error || !userData) {
        console.error('❌ Erro ao verificar permissões:', error);
        alert('❌ Erro ao verificar permissões');
        window.location.href = 'index.html';
        return false;
    }
    
    if (!userData.is_admin && userData.role !== 'admin') {
        alert('❌ Acesso negado! Você não é administrador.');
        window.location.href = 'dashboard.html';
        return false;
    }
    
    return true;
}

// Modificar a função de inicialização
document.addEventListener('DOMContentLoaded', async function() {
    await verificarAutenticacao();
    
    // ✅ ADICIONAR ESTA LINHA
    const isAdmin = await verificarPermissaoAdmin();
    if (!isAdmin) return;
    
    await verificarAdmin();
    initializeAdmin();
});
async function verificarAdmin() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        window.location.href = 'login.html';
        return;
    }
    
    // Verificar se é admin
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();
        
    if (userError || !userData?.is_admin) {
        alert('❌ Acesso negado! Você não tem permissões de administrador.');
        window.location.href = 'dashboard.html';
        return;
    }
}

// ... resto do código continua igual

// Dentro da função initializeAdmin(), adicione:
async function initializeAdmin() {
    await carregarEstatisticas();
    await carregarJogadores();
    await carregarTimes();
    await carregarRodadas();
    
    // ✅ ADICIONAR ESTAS LINHAS:
    await carregarRodadasSelect();
    await carregarJogadoresSelect();
    
    setupEventListeners();
    setupFiltros();
    
    // ✅ ADICIONAR ESTA LINHA:
    setupEventListenersEstatisticas();
}

// ============= ESTATÍSTICAS =============
async function carregarEstatisticas() {
    try {
        // Contar jogadores
        const { count: jogadores } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true });
        document.getElementById('total-jogadores').textContent = jogadores || 0;
        
        // Contar times únicos
        const { data: timesData } = await supabase
            .from('players')
            .select('team');
        const timesUnicos = [...new Set(timesData?.map(p => p.team))].length;
        document.getElementById('total-times').textContent = timesUnicos || 0;
        
        // Contar rodadas
        const { count: rodadas } = await supabase
            .from('rounds')
            .select('*', { count: 'exact', head: true });
        document.getElementById('total-rodadas').textContent = rodadas || 0;
        
        // Contar usuários
        const { count: usuarios } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        document.getElementById('total-usuarios').textContent = usuarios || 0;
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// ============= GERENCIAMENTO DE JOGADORES =============
let jogadoresGlobais = [];

async function carregarJogadores() {
    try {
        showLoading();
        const { data: jogadores, error } = await supabase
            .from('players')
            .select('*')
            .order('team', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;
        
        jogadoresGlobais = jogadores || [];
        renderizarJogadores(jogadoresGlobais);
        preencherFiltroTimes(jogadoresGlobais);
        
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
        alert('❌ Erro ao carregar jogadores: ' + error.message);
    } finally {
        hideLoading();
    }
}

function renderizarJogadores(jogadores) {
    const container = document.getElementById('lista-jogadores-admin');
    
    if (!jogadores || jogadores.length === 0) {
        container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center col-span-2">Nenhum jogador encontrado.</p>';
        return;
    }
    
    container.innerHTML = jogadores.map(jogador => `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        ${jogador.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h4 class="font-medium text-gray-900 dark:text-white">${jogador.name}</h4>
                        <p class="text-sm text-gray-500 dark:text-gray-400">${jogador.team}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-2">
                    <button onclick="editarJogador(${jogador.id})" 
                            class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        ✏️
                    </button>
                    <button onclick="deletarJogador(${jogador.id})" 
                            class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                        🗑️
                    </button>
                </div>
            </div>
            
            <div class="flex items-center justify-between text-sm">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPosicaoClass(jogador.position)}">
                    ${getPosicaoIcon(jogador.position)} ${getPosicaoNome(jogador.position)}
                </span>
                <span class="font-semibold text-green-600 dark:text-green-400">C$ ${jogador.price.toFixed(2)}</span>
            </div>
            
            ${jogador.points !== undefined ? `
                <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    Pontos: ${jogador.points} | Média: ${(jogador.average_points || 0).toFixed(1)}
                </div>
            ` : ''}
        </div>
    `).join('');
}

function getPosicaoClass(position) {
    const classes = {
        'GOL': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        'FIX': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'ALA': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'PIV': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };
    return classes[position] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
}

function getPosicaoIcon(position) {
    const icons = {
        'GOL': '🥅',
        'FIX': '🛡️',
        'ALA': '🏃',
        'PIV': '🎯'
    };
    return icons[position] || '👤';
}

function getPosicaoNome(position) {
    const nomes = {
        'GOL': 'Goleiro',
        'FIX': 'Fixo',
        'ALA': 'Ala',
        'PIV': 'Pivô'
    };
    return nomes[position] || position;
}

// ============= FILTROS DE JOGADORES =============
function setupFiltros() {
    // Filtros por posição
    document.querySelectorAll('[data-filtro]').forEach(btn => {
        btn.addEventListener('click', function() {
            // Atualizar botões ativos
            document.querySelectorAll('[data-filtro]').forEach(b => {
                b.className = 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-300 dark:hover:bg-gray-600';
            });
            this.className = 'bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors';
            
            filtrarJogadores();
        });
    });
    
    // Busca por nome
    document.getElementById('buscar-jogador').addEventListener('input', filtrarJogadores);
    
    // Filtro por time
    document.getElementById('filtrar-time').addEventListener('change', filtrarJogadores);
}

function filtrarJogadores() {
    const posicaoFiltro = document.querySelector('[data-filtro].bg-blue-600')?.getAttribute('data-filtro');
    const busca = document.getElementById('buscar-jogador').value.toLowerCase();
    const timeFiltro = document.getElementById('filtrar-time').value;
    
    let jogadoresFiltrados = jogadoresGlobais;
    
    // Filtrar por posição
    if (posicaoFiltro && posicaoFiltro !== 'todos') {
        jogadoresFiltrados = jogadoresFiltrados.filter(j => j.position === posicaoFiltro);
    }
    
    // Filtrar por busca
    if (busca) {
        jogadoresFiltrados = jogadoresFiltrados.filter(j => 
            j.name.toLowerCase().includes(busca) || 
            j.team.toLowerCase().includes(busca)
        );
    }
    
    // Filtrar por time
    if (timeFiltro) {
        jogadoresFiltrados = jogadoresFiltrados.filter(j => j.team === timeFiltro);
    }
    
    renderizarJogadores(jogadoresFiltrados);
}

function preencherFiltroTimes(jogadores) {
    const select = document.getElementById('filtrar-time');
    const times = [...new Set(jogadores.map(j => j.team))].sort();
    
    select.innerHTML = '<option value="">Todos os times</option>';
    times.forEach(time => {
        select.innerHTML += `<option value="${time}">${time}</option>`;
    });
}

// ============= CRUD JOGADOR INDIVIDUAL =============
async function salvarJogador(event) {
    event.preventDefault();
    
    const jogadorId = document.getElementById('jogador-id').value;
    const dadosJogador = {
        name: document.getElementById('name').value.trim(),
        position: document.getElementById('position').value,
        team: document.getElementById('team').value.trim(),
        price: parseFloat(document.getElementById('price').value),
        photo_url: document.getElementById('photo_url').value.trim() || null
    };
    
    // Validações
    if (!dadosJogador.name || !dadosJogador.position || !dadosJogador.team || !dadosJogador.price) {
        alert('❌ Preencha todos os campos obrigatórios!');
        return;
    }
    
    if (dadosJogador.price < 0.5 || dadosJogador.price > 10) {
        alert('❌ O preço deve estar entre C$ 0.50 e C$ 10.00!');
        return;
    }
    
    try {
        showLoading();
        
        let result;
        if (jogadorId) {
            // Atualizar
            result = await supabase
                .from('players')
                .update(dadosJogador)
                .eq('id', jogadorId);
        } else {
            // Criar
            result = await supabase
                .from('players')
                .insert([dadosJogador]);
        }
        
        if (result.error) throw result.error;
        
        alert(`✅ Jogador ${jogadorId ? 'atualizado' : 'adicionado'} com sucesso!`);
        document.getElementById('form-jogador').reset();
        document.getElementById('jogador-id').value = '';
        document.getElementById('btn-cancelar-jogador').style.display = 'none';
        
        await carregarJogadores();
        await carregarEstatisticas();
        
    } catch (error) {
        console.error('Erro ao salvar jogador:', error);
        alert('❌ Erro ao salvar jogador: ' + error.message);
    } finally {
        hideLoading();
    }
}

function editarJogador(id) {
    const jogador = jogadoresGlobais.find(j => j.id === id);
    if (!jogador) return;
    
    document.getElementById('jogador-id').value = jogador.id;
    document.getElementById('name').value = jogador.name;
    document.getElementById('position').value = jogador.position;
    document.getElementById('team').value = jogador.team;
    document.getElementById('price').value = jogador.price;
    document.getElementById('photo_url').value = jogador.photo_url || '';
    
    document.getElementById('btn-cancelar-jogador').style.display = 'inline-block';
    
    // Scroll para o formulário
    document.getElementById('form-jogador-individual').scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicaoJogador() {
    document.getElementById('form-jogador').reset();
    document.getElementById('jogador-id').value = '';
    document.getElementById('btn-cancelar-jogador').style.display = 'none';
}

async function deletarJogador(id) {
    const jogador = jogadoresGlobais.find(j => j.id === id);
    if (!jogador) return;
    
    if (!confirm(`❌ Tem certeza que deseja deletar ${jogador.name}?
Esta ação não pode ser desfeita!`)) {
        return;
    }
    
    try {
        showLoading();
        
        const { error } = await supabase
            .from('players')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        
        alert(`✅ ${jogador.name} foi removido com sucesso!`);
        await carregarJogadores();
        await carregarEstatisticas();
        
    } catch (error) {
        console.error('Erro ao deletar jogador:', error);
        alert('❌ Erro ao deletar jogador: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============= SISTEMA DE TIMES COMPLETOS =============
async function salvarTimeCompleto(event) {
    event.preventDefault();
    
    const nomeTime = document.getElementById('nome-time').value.trim();
    if (!nomeTime) {
        alert('❌ Digite o nome do time!');
        return;
    }
    
    // Coletar dados dos jogadores
    const jogadores = [];
    
    // Goleiro
    const golNome = document.getElementById('gol-nome').value.trim();
    const golPreco = parseFloat(document.getElementById('gol-preco').value);
    
    if (!golNome || !golPreco) {
        alert('❌ Preencha os dados do goleiro!');
        return;
    }
    
    jogadores.push({
        name: golNome,
        position: 'GOL',
        team: nomeTime,
        price: golPreco
    });
    
    // Fixos
    const fixosNomes = document.querySelectorAll('.fixo-nome');
    const fixosPrecos = document.querySelectorAll('.fixo-preco');
    
    for (let i = 0; i < fixosNomes.length; i++) {
        const nome = fixosNomes[i].value.trim();
        const preco = parseFloat(fixosPrecos[i].value);
        
        if (!nome || !preco) {
            alert(`❌ Preencha os dados do fixo ${i + 1}!`);
            return;
        }
        
        jogadores.push({
            name: nome,
            position: 'FIX',
            team: nomeTime,
            price: preco
        });
    }
    
    // Alas
    const alasNomes = document.querySelectorAll('.ala-nome');
    const alasPrecos = document.querySelectorAll('.ala-preco');
    
    for (let i = 0; i < alasNomes.length; i++) {
        const nome = alasNomes[i].value.trim();
        const preco = parseFloat(alasPrecos[i].value);
        
        if (!nome || !preco) {
            alert(`❌ Preencha os dados do ala ${i + 1}!`);
            return;
        }
        
        jogadores.push({
            name: nome,
            position: 'ALA',
            team: nomeTime,
            price: preco
        });
    }
    
    // Pivôs
    const pivosNomes = document.querySelectorAll('.pivo-nome');
    const pivosPrecos = document.querySelectorAll('.pivo-preco');
    
    for (let i = 0; i < pivosNomes.length; i++) {
        const nome = pivosNomes[i].value.trim();
        const preco = parseFloat(pivosPrecos[i].value);
        
        if (!nome || !preco) {
            alert(`❌ Preencha os dados do pivô ${i + 1}!`);
            return;
        }
        
        jogadores.push({
            name: nome,
            position: 'PIV',
            team: nomeTime,
            price: preco
        });
    }
    
    // Validar preços
    const precosInvalidos = jogadores.filter(j => j.price < 0.5 || j.price > 10);
    if (precosInvalidos.length > 0) {
        alert('❌ Todos os preços devem estar entre C$ 0.50 e C$ 10.00!');
        return;
    }
    
    // Verificar se o time já existe
    const timeExiste = jogadoresGlobais.some(j => j.team.toLowerCase() === nomeTime.toLowerCase());
    if (timeExiste) {
        if (!confirm(`⚠️ O time "${nomeTime}" já existe! Deseja adicionar os jogadores mesmo assim?`)) {
            return;
        }
    }
    
    try {
        showLoading();
        
        const { error } = await supabase
            .from('players')
            .insert(jogadores);
            
        if (error) throw error;
        
        alert(`✅ Time "${nomeTime}" cadastrado com sucesso!
${jogadores.length} jogadores adicionados.`);
        
        // Limpar formulário
        document.getElementById('form-time-completo').reset();
        resetarFormularioTime();
        
        await carregarJogadores();
        await carregarEstatisticas();
        
    } catch (error) {
        console.error('Erro ao salvar time:', error);
        alert('❌ Erro ao salvar time: ' + error.message);
    } finally {
        hideLoading();
    }
}

function adicionarJogadorPosicao(container, posicao) {
    const containerEl = document.getElementById(`${container}-container`);
    const novoJogador = document.createElement('div');
    novoJogador.className = 'grid grid-cols-2 gap-4';
    
    const classeNome = posicao === 'FIX' ? 'fixo-nome' : posicao === 'ALA' ? 'ala-nome' : 'pivo-nome';
    const classePreco = posicao === 'FIX' ? 'fixo-preco' : posicao === 'ALA' ? 'ala-preco' : 'pivo-preco';
    const placeholder = posicao === 'FIX' ? 'fixo' : posicao === 'ALA' ? 'ala' : 'pivô';
    
    novoJogador.innerHTML = `
        <input type="text" placeholder="Nome do ${placeholder}" required 
               class="${classeNome} px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
        <div class="flex gap-2">
            <input type="number" placeholder="Preço" step="0.10" min="0.50" max="10" required 
                   class="${classePreco} flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <button type="button" onclick="removerJogador(this)" class="text-red-600 hover:text-red-800 px-2">❌</button>
        </div>
    `;
    
    containerEl.appendChild(novoJogador);
}

function removerJogador(button) {
    button.closest('.grid').remove();
}

function resetarFormularioTime() {
    // Reset containers para configuração inicial
    document.getElementById('fixos-container').innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Nome do fixo" required 
                   class="fixo-nome px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <input type="number" placeholder="Preço" step="0.10" min="0.50" max="10" required 
                   class="fixo-preco px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
        </div>
    `;
    
    document.getElementById('alas-container').innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Nome do ala" required 
                   class="ala-nome px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <input type="number" placeholder="Preço" step="0.10" min="0.50" max="10" required 
                   class="ala-preco px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
        </div>
        <div class="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Nome do ala" required 
                   class="ala-nome px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <input type="number" placeholder="Preço" step="0.10" min="0.50" max="10" required 
                   class="ala-preco px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
        </div>
    `;
    
    document.getElementById('pivos-container').innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Nome do pivô" required 
                   class="pivo-nome px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <input type="number" placeholder="Preço" step="0.10" min="0.50" max="10" required 
                   class="pivo-preco px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
        </div>
    `;
}

// ============= GERENCIAMENTO DE TIMES =============
async function carregarTimes() {
    try {
        const { data: jogadores, error } = await supabase
            .from('players')
            .select('team, position')
            .order('team');
            
        if (error) throw error;
        
        // Agrupar por time
        const timesPorNome = {};
        jogadores.forEach(jogador => {
            if (!timesPorNome[jogador.team]) {
                timesPorNome[jogador.team] = {};
            }
            timesPorNome[jogador.team][jogador.position] = (timesPorNome[jogador.team][jogador.position] || 0) + 1;
        });
        
        renderizarTimes(timesPorNome);
        
    } catch (error) {
        console.error('Erro ao carregar times:', error);
    }
}

function renderizarTimes(times) {
    const container = document.getElementById('lista-times');
    const timesArray = Object.entries(times);
    
    if (timesArray.length === 0) {
        container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center">Nenhum time encontrado.</p>';
        return;
    }
    
    container.innerHTML = timesArray.map(([nomeTime, posicoes]) => {
        const totalJogadores = Object.values(posicoes).reduce((sum, count) => sum + count, 0);
        
        return `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div class="flex items-center justify-between mb-3">
                    <h4 class="font-semibold text-lg text-gray-900 dark:text-white">⚽ ${nomeTime}</h4>
                    <div class="flex items-center space-x-2">
                        <span class="text-sm text-gray-500 dark:text-gray-400">${totalJogadores} jogadores</span>
                        <button onclick="deletarTime('${nomeTime}')" 
                                class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                            🗑️
                        </button>
                    </div>
                </div>
                
                <div class="grid grid-cols-4 gap-2 text-sm">
                    <div class="text-center">
                        <span class="text-yellow-600 dark:text-yellow-400">🥅</span>
                        <div>${posicoes.GOL || 0}</div>
                    </div>
                    <div class="text-center">
                        <span class="text-blue-600 dark:text-blue-400">🛡️</span>
                        <div>${posicoes.FIX || 0}</div>
                    </div>
                    <div class="text-center">
                        <span class="text-green-600 dark:text-green-400">🏃</span>
                        <div>${posicoes.ALA || 0}</div>
                    </div>
                    <div class="text-center">
                        <span class="text-purple-600 dark:text-purple-400">🎯</span>
                        <div>${posicoes.PIV || 0}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function deletarTime(nomeTime) {
    if (!confirm(`❌ Tem certeza que deseja deletar o time "${nomeTime}"?
Todos os jogadores do time serão removidos!
Esta ação não pode ser desfeita!`)) {
        return;
    }
    
    try {
        showLoading();
        
        const { error } = await supabase
            .from('players')
            .delete()
            .eq('team', nomeTime);
            
        if (error) throw error;
        
        alert(`✅ Time "${nomeTime}" foi removido com sucesso!`);
        await carregarJogadores();
        await carregarTimes();
        await carregarEstatisticas();
        
    } catch (error) {
        console.error('Erro ao deletar time:', error);
        alert('❌ Erro ao deletar time: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============= GERENCIAMENTO DE RODADAS =============
let rodadasGlobais = [];

async function carregarRodadas() {
    try {
        const { data: rodadas, error } = await supabase
            .from('rounds')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        rodadasGlobais = rodadas || [];
        renderizarRodadas(rodadasGlobais);
        
    } catch (error) {
        console.error('Erro ao carregar rodadas:', error);
    }
}

function renderizarRodadas(rodadas) {
    const container = document.getElementById('lista-rodadas-admin');
    
    if (!container) {
        console.warn('⚠️ Elemento lista-rodadas-admin não encontrado no HTML');
        return;
    }
    
    if (!rodadas || rodadas.length === 0) {
        container.innerHTML = `
            <p class="text-center text-gray-500 dark:text-gray-400 py-4">
                Nenhuma rodada encontrada.
            </p>
        `;
        return;
    }
    
    container.innerHTML = rodadas.map(rodada => {
        const statusConfig = {
            'active': {
                color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                icon: '🟢',
                text: 'Ativa'
            },
            'closed': {
                color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
                icon: '🟡',
                text: 'Fechada'
            },
            'finished': {
                color: 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
                icon: '⚫',
                text: 'Finalizada'
            }
        };
        
        const status = statusConfig[rodada.status] || statusConfig.finished;
        const dataCriacao = new Date(rodada.created_at).toLocaleDateString('pt-BR');
        
        return `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div class="flex items-center justify-between mb-3">
                    <div>
                        <h4 class="font-semibold text-gray-900 dark:text-white">${rodada.name}</h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400">Criada em: ${dataCriacao}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}">
                            ${status.icon} ${status.text}
                        </span>
                    </div>
                </div>
                
                <div class="flex gap-2">
                    <button onclick="editarRodada(${rodada.id})" 
                            class="text-blue-600 hover:text-blue-800 dark:text-blue-400 text-sm">
                        ✏️ Editar
                    </button>
                    <button onclick="deletarRodada(${rodada.id})" 
                            class="text-red-600 hover:text-red-800 dark:text-red-400 text-sm">
                        🗑️ Deletar
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function salvarRodada(event) {
    event.preventDefault();
    
    const rodadaId = document.getElementById('rodada-id').value;
    const dadosRodada = {
        name: document.getElementById('round-name').value.trim(),
        status: document.getElementById('round-status').value
    };
    
    if (!dadosRodada.name) {
        alert('❌ Digite o nome da rodada!');
        return;
    }
    
    try {
        showLoading();
        
        let result;
        if (rodadaId) {
            // Atualizar
            result = await supabase
                .from('rounds')
                .update(dadosRodada)
                .eq('id', rodadaId);
        } else {
            // Criar
            result = await supabase
                .from('rounds')
                .insert([dadosRodada]);
        }
        
        if (result.error) throw result.error;
        
        alert(`✅ Rodada ${rodadaId ? 'atualizada' : 'criada'} com sucesso!`);
        document.getElementById('form-rodada').reset();
        document.getElementById('rodada-id').value = '';
        document.getElementById('btn-cancelar-rodada').style.display = 'none';
        
        await carregarRodadas();
        await carregarEstatisticas();
        
    } catch (error) {
        console.error('Erro ao salvar rodada:', error);
        alert('❌ Erro ao salvar rodada: ' + error.message);
    } finally {
        hideLoading();
    }
}

function editarRodada(id) {
    const rodada = rodadasGlobais.find(r => r.id === id);
    if (!rodada) return;
    
    document.getElementById('rodada-id').value = rodada.id;
    document.getElementById('round-name').value = rodada.name;
    document.getElementById('round-status').value = rodada.status;
    
    document.getElementById('btn-cancelar-rodada').style.display = 'inline-block';
    
    // Scroll para o formulário
    document.querySelector('#content-rodadas').scrollIntoView({ behavior: 'smooth' });
}

function cancelarEdicaoRodada() {
    document.getElementById('form-rodada').reset();
    document.getElementById('rodada-id').value = '';
    document.getElementById('btn-cancelar-rodada').style.display = 'none';
}

async function deletarRodada(id) {
    const rodada = rodadasGlobais.find(r => r.id === id);
    if (!rodada) return;
    
    if (!confirm(`❌ Tem certeza que deseja deletar a rodada "${rodada.name}"?
Esta ação não pode ser desfeita!`)) {
        return;
    }
    
    try {
        showLoading();
        
        const { error } = await supabase
            .from('rounds')
            .delete()
            .eq('id', id);
            
        if (error) throw error;
        
        alert(`✅ Rodada "${rodada.name}" foi removida com sucesso!`);
        await carregarRodadas();
        await carregarEstatisticas();
        
    } catch (error) {
        console.error('Erro ao deletar rodada:', error);
        alert('❌ Erro ao deletar rodada: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function ativarRodada(id) {
    const rodada = rodadasGlobais.find(r => r.id === id);
    if (!rodada) return;
    
    if (!confirm(`🏆 Ativar a rodada "${rodada.name}"?
Todas as outras rodadas serão desativadas.`)) {
        return;
    }
    
    try {
        showLoading();
        
        // Primeiro desativar todas as rodadas
        await supabase
            .from('rounds')
            .update({ status: 'upcoming' })
            .neq('id', id);
        
        // Depois ativar a rodada selecionada
        const { error } = await supabase
            .from('rounds')
            .update({ status: 'active' })
            .eq('id', id);
            
        if (error) throw error;
        
        alert(`✅ Rodada "${rodada.name}" foi ativada com sucesso!`);
        await carregarRodadas();
        
    } catch (error) {
        console.error('Erro ao ativar rodada:', error);
        alert('❌ Erro ao ativar rodada: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function finalizarRodada(id) {
    const rodada = rodadasGlobais.find(r => r.id === id);
    if (!rodada) return;
    
    if (!confirm(`⏹️ Finalizar a rodada "${rodada.name}"?
Após finalizar, você poderá criar uma nova rodada.`)) {
        return;
    }
    
    try {
        showLoading();
        
        const { error } = await supabase
            .from('rounds')
            .update({ status: 'finished' })
            .eq('id', id);
            
        if (error) throw error;
        
        alert(`✅ Rodada "${rodada.name}" foi finalizada com sucesso!`);
        await carregarRodadas();
        
    } catch (error) {
        console.error('Erro ao finalizar rodada:', error);
        alert('❌ Erro ao finalizar rodada: ' + error.message);
    } finally {
        hideLoading();
    }
}

async function reativarRodada(id) {
    const rodada = rodadasGlobais.find(r => r.id === id);
    if (!rodada) return;
    
    if (!confirm(`🔄 Reativar a rodada "${rodada.name}"?
Todas as outras rodadas serão desativadas.`)) {
        return;
    }
    
    try {
        showLoading();
        
        // Primeiro desativar todas as rodadas
        await supabase
            .from('rounds')
            .update({ status: 'upcoming' })
            .neq('id', id);
        
        // Depois reativar a rodada selecionada
        const { error } = await supabase
            .from('rounds')
            .update({ status: 'active' })
            .eq('id', id);
            
        if (error) throw error;
        
        alert(`✅ Rodada "${rodada.name}" foi reativada com sucesso!`);
        await carregarRodadas();
        
    } catch (error) {
        console.error('Erro ao reativar rodada:', error);
        alert('❌ Erro ao reativar rodada: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============= SISTEMA DE TABS =============
function mudarTab(tabName) {
    // Ocultar todas as tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Remover classe ativa de todos os botões
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Mostrar tab selecionada
    const contentTab = document.getElementById(`content-${tabName}`);
    if (contentTab) {
        contentTab.classList.remove('hidden');
    }
    
    // Ativar botão selecionado
    const activeButton = document.getElementById(`tab-${tabName}`);
    if (activeButton) {
        activeButton.classList.add('active', 'border-blue-500', 'text-blue-600');
        activeButton.classList.remove('border-transparent', 'text-gray-500');
    }
}
// ============= EVENT LISTENERS =============
function setupEventListeners() {
    // Formulários
    document.getElementById('form-jogador').addEventListener('submit', salvarJogador);
    document.getElementById('form-time-completo').addEventListener('submit', salvarTimeCompleto);
    document.getElementById('form-rodada').addEventListener('submit', salvarRodada);
    
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}

// ============= UTILITÁRIOS =============
function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    
    if (isDark) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
    }
}

// Aplicar tema salvo
function aplicarTema() {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }
}

// Aplicar tema ao carregar
aplicarTema();

// ============= LOGOUT =============
async function logout() {
    if (confirm('🚪 Tem certeza que deseja sair?')) {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Erro ao fazer logout:', error);
        }
        window.location.href = 'index.html';
    }
}

// ============= INICIALIZAÇÃO FINAL =============
// Verificar se todas as funções estão disponíveis globalmente
window.editarJogador = editarJogador;
window.deletarJogador = deletarJogador;
window.cancelarEdicaoJogador = cancelarEdicaoJogador;
window.editarRodada = editarRodada;
window.deletarRodada = deletarRodada;
window.cancelarEdicaoRodada = cancelarEdicaoRodada;
window.ativarRodada = ativarRodada;
window.finalizarRodada = finalizarRodada;
window.reativarRodada = reativarRodada;
window.deletarTime = deletarTime;
window.adicionarJogadorPosicao = adicionarJogadorPosicao;
window.removerJogador = removerJogador;
window.mudarTab = mudarTab;
window.logout = logout;

console.log('🎮 Admin Panel carregado com sucesso!');
// ============================================
// ADICIONAR AO FINAL DO admin.js
// Sistema de Estatísticas ao Vivo
// ============================================

let rodadasDisponiveis = [];
let jogadoresDisponiveis = [];
let estatisticasAtuais = [];

// ============= INICIALIZAÇÃO =============

// Adicionar ao DOMContentLoaded existente:
// Após initializeAdmin(), adicione:
// carregarRodadasSelect();
// carregarJogadoresSelect();
// setupEventListenersEstatisticas();

async function carregarRodadasSelect() {
    try {
        const { data, error } = await supabase
            .from('rounds')
            .select('id, name, status')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        rodadasDisponiveis = data || [];
        
        const select = document.getElementById('stat-round');
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecione a rodada...</option>';
        rodadasDisponiveis.forEach(round => {
            const badge = round.status === 'active' ? ' ⚡ ATIVA' : round.status === 'finished' ? ' ✅' : '';
            select.innerHTML += `<option value="${round.id}">${round.name}${badge}</option>`;
        });
        
    } catch (error) {
        console.error('Erro ao carregar rodadas:', error);
    }
}

async function carregarJogadoresSelect() {
    try {
        const { data, error } = await supabase
            .from('players')
            .select('id, name, position, team')
            .order('team')
            .order('name');
        
        if (error) throw error;
        
        jogadoresDisponiveis = data || [];
        
        const select = document.getElementById('stat-player');
        if (!select) return;
        
        select.innerHTML = '<option value="">Selecione o jogador...</option>';
        
        // Agrupar por time
        const times = {};
        jogadoresDisponiveis.forEach(player => {
            if (!times[player.team]) times[player.team] = [];
            times[player.team].push(player);
        });
        
        // Criar optgroups
        Object.keys(times).sort().forEach(team => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = team;
            
            times[team].forEach(player => {
                const option = document.createElement('option');
                option.value = player.id;
                option.textContent = `${player.name} (${player.position})`;
                optgroup.appendChild(option);
            });
            
            select.appendChild(optgroup);
        });
        
    } catch (error) {
        console.error('Erro ao carregar jogadores:', error);
    }
}

// ============= EVENT LISTENERS =============

function setupEventListenersEstatisticas() {
    // Listener de rodada
    const selectRound = document.getElementById('stat-round');
    if (selectRound) {
        selectRound.addEventListener('change', async function() {
            if (this.value) {
                await carregarEstatisticasRodada(this.value);
            }
        });
    }
    
    // Listener de jogador
    const selectPlayer = document.getElementById('stat-player');
    if (selectPlayer) {
        selectPlayer.addEventListener('change', async function() {
            const roundId = document.getElementById('stat-round').value;
            if (this.value && roundId) {
                await buscarEstatisticaExistente(roundId, this.value);
            }
        });
    }
    
    // Listeners para calcular pontos em tempo real
    const inputs = [
        'stat-goals', 'stat-assists', 'stat-shots', 'stat-tackles',
        'stat-interceptions', 'stat-blocks', 'stat-saves', 'stat-goals-conceded',
        'stat-yellow', 'stat-red', 'stat-fouls-committed', 'stat-fouls-suffered',
        'stat-own-goals', 'stat-minutes'
    ];
    
    inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', calcularPontosPreview);
        }
    });
    
    // Checkboxes
    const checkClean = document.getElementById('stat-clean-sheet');
    const checkPenalty = document.getElementById('stat-penalty-saved');
    if (checkClean) checkClean.addEventListener('change', calcularPontosPreview);
    if (checkPenalty) checkPenalty.addEventListener('change', calcularPontosPreview);
    
    // Form submit
    const formEstatisticas = document.getElementById('form-estatisticas');
    if (formEstatisticas) {
        formEstatisticas.addEventListener('submit', salvarEstatisticas);
    }
}

// ============= BUSCAR/CARREGAR DADOS =============

async function buscarEstatisticaExistente(roundId, playerId) {
    try {
        const { data, error } = await supabase
            .from('player_stats')
            .select('*')
            .eq('round_id', roundId)
            .eq('player_id', playerId)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        if (data) {
            // Preencher formulário
            document.getElementById('stat-goals').value = data.goals;
            document.getElementById('stat-assists').value = data.assists;
            document.getElementById('stat-shots').value = data.shots_on_target;
            document.getElementById('stat-tackles').value = data.tackles;
            document.getElementById('stat-interceptions').value = data.interceptions;
            document.getElementById('stat-blocks').value = data.blocks;
            document.getElementById('stat-saves').value = data.saves;
            document.getElementById('stat-goals-conceded').value = data.goals_conceded;
            document.getElementById('stat-clean-sheet').checked = data.clean_sheet;
            document.getElementById('stat-penalty-saved').checked = data.penalty_saved;
            document.getElementById('stat-yellow').value = data.yellow_cards;
            document.getElementById('stat-red').value = data.red_cards;
            document.getElementById('stat-fouls-committed').value = data.fouls_committed;
            document.getElementById('stat-fouls-suffered').value = data.fouls_suffered;
            document.getElementById('stat-own-goals').value = data.own_goals;
            document.getElementById('stat-minutes').value = data.minutes_played;
            
            calcularPontosPreview();
        } else {
            limparFormularioEstatisticas();
        }
        
    } catch (error) {
        console.error('Erro ao buscar estatística:', error);
    }
}

async function carregarEstatisticasRodada(roundId) {
    try {
        showLoading();
        
        const { data, error } = await supabase
            .from('player_stats')
            .select(`
                *,
                players (name, position, team)
            `)
            .eq('round_id', roundId)
            .order('total_points', { ascending: false });
        
        if (error) throw error;
        
        estatisticasAtuais = data || [];
        renderizarEstatisticasRodada(estatisticasAtuais);
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        alert('Erro ao carregar estatísticas da rodada');
    } finally {
        hideLoading();
    }
}

// ============= RENDERIZAÇÃO =============

function renderizarEstatisticasRodada(stats) {
    const container = document.getElementById('lista-estatisticas');
    if (!container) return;
    
    if (stats.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                Nenhuma estatística cadastrada para esta rodada
            </div>
        `;
        return;
    }
    
    container.innerHTML = stats.map(stat => `
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <div class="flex items-center space-x-3">
                        <span class="text-2xl font-bold ${stat.total_points >= 0 ? 'text-green-600' : 'text-red-600'}">
                            ${stat.total_points.toFixed(1)}
                        </span>
                        <div>
                            <h4 class="font-semibold text-gray-900 dark:text-white">${stat.players.name}</h4>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                                ${getPosicaoNome(stat.players.position)} - ${stat.players.team}
                            </p>
                        </div>
                    </div>
                    
                    <div class="mt-2 flex flex-wrap gap-2 text-xs">
                        ${stat.goals > 0 ? `<span class="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-1 rounded">⚽ ${stat.goals}G</span>` : ''}
                        ${stat.assists > 0 ? `<span class="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded">🎯 ${stat.assists}A</span>` : ''}
                        ${stat.saves > 0 ? `<span class="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-1 rounded">🧤 ${stat.saves} Def</span>` : ''}
                        ${stat.clean_sheet ? `<span class="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded">🛡️ Clean</span>` : ''}
                        ${stat.yellow_cards > 0 ? `<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">🟨 ${stat.yellow_cards}</span>` : ''}
                        ${stat.red_cards > 0 ? `<span class="bg-red-100 text-red-800 px-2 py-1 rounded">🟥 ${stat.red_cards}</span>` : ''}
                    </div>
                </div>
                
                <div class="flex space-x-2">
                    <button onclick="editarEstatistica('${stat.player_id}')" 
                            class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                        ✏️
                    </button>
                    <button onclick="deletarEstatistica('${stat.player_id}', '${stat.round_id}')" 
                            class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ============= CALCULAR PONTOS PREVIEW =============

function calcularPontosPreview() {
    const playerId = document.getElementById('stat-player').value;
    if (!playerId) return;
    
    const player = jogadoresDisponiveis.find(p => p.id == playerId);
    if (!player) return;
    
    let points = 0;
    
    // Pegar valores
    const goals = parseInt(document.getElementById('stat-goals').value) || 0;
    const assists = parseInt(document.getElementById('stat-assists').value) || 0;
    const shots = parseInt(document.getElementById('stat-shots').value) || 0;
    const tackles = parseInt(document.getElementById('stat-tackles').value) || 0;
    const interceptions = parseInt(document.getElementById('stat-interceptions').value) || 0;
    const blocks = parseInt(document.getElementById('stat-blocks').value) || 0;
    const saves = parseInt(document.getElementById('stat-saves').value) || 0;
    const goalsConceded = parseInt(document.getElementById('stat-goals-conceded').value) || 0;
    const cleanSheet = document.getElementById('stat-clean-sheet').checked;
    const penaltySaved = document.getElementById('stat-penalty-saved').checked;
    const yellow = parseInt(document.getElementById('stat-yellow').value) || 0;
    const red = parseInt(document.getElementById('stat-red').value) || 0;
    const foulsCommitted = parseInt(document.getElementById('stat-fouls-committed').value) || 0;
    const foulsSuffered = parseInt(document.getElementById('stat-fouls-suffered').value) || 0;
    const ownGoals = parseInt(document.getElementById('stat-own-goals').value) || 0;
    
    // Calcular (mesma lógica do SQL)
    switch (player.position) {
        case 'GOL': points += goals * 12; break;
        case 'FIX': points += goals * 10; break;
        case 'ALA': points += goals * 8; break;
        case 'PIV': points += goals * 8; break;
    }
    
    points += assists * 5;
    points += shots * 1.5;
    points += tackles * 2;
    points += interceptions * 2;
    points += blocks * 2;
    
    if (player.position === 'GOL') {
        points += saves * 1.5;
    }
    
    if (cleanSheet) {
        if (player.position === 'GOL') points += 8;
        else if (player.position === 'FIX') points += 5;
        else points += 3;
    }
    
    if (penaltySaved) points += 10;
    
    points += foulsSuffered * 0.5;
    points -= ownGoals * 5;
    
    if (player.position === 'GOL' || player.position === 'FIX') {
        points -= goalsConceded * 2;
    }
    
    points -= yellow * 2;
    points -= red * 5;
    points -= foulsCommitted * 0.5;
    
    // Atualizar display
    const preview = document.getElementById('points-preview');
    if (preview) {
        preview.textContent = points.toFixed(2);
        preview.className = points >= 0 ? 
            'text-2xl font-bold text-green-600 dark:text-green-400' : 
            'text-2xl font-bold text-red-600 dark:text-red-400';
    }
}

// ============= SALVAR ESTATÍSTICAS =============

async function salvarEstatisticas(event) {
    event.preventDefault();
    
    const roundId = document.getElementById('stat-round').value;
    const playerId = document.getElementById('stat-player').value;
    
    if (!roundId || !playerId) {
        alert('Selecione uma rodada e um jogador!');
        return;
    }
    
    // ✅ NÃO CONVERTER PARA parseInt - Manter como string (para UUID)
    const dados = {
        round_id: roundId,        // ← SEM parseInt()
        player_id: playerId,       // ← SEM parseInt()
        goals: parseInt(document.getElementById('stat-goals').value) || 0,
        assists: parseInt(document.getElementById('stat-assists').value) || 0,
        shots_on_target: parseInt(document.getElementById('stat-shots').value) || 0,
        tackles: parseInt(document.getElementById('stat-tackles').value) || 0,
        interceptions: parseInt(document.getElementById('stat-interceptions').value) || 0,
        blocks: parseInt(document.getElementById('stat-blocks').value) || 0,
        saves: parseInt(document.getElementById('stat-saves').value) || 0,
        goals_conceded: parseInt(document.getElementById('stat-goals-conceded').value) || 0,
        clean_sheet: document.getElementById('stat-clean-sheet').checked,
        penalty_saved: document.getElementById('stat-penalty-saved').checked,
        yellow_cards: parseInt(document.getElementById('stat-yellow').value) || 0,
        red_cards: parseInt(document.getElementById('stat-red').value) || 0,
        fouls_committed: parseInt(document.getElementById('stat-fouls-committed').value) || 0,
        fouls_suffered: parseInt(document.getElementById('stat-fouls-suffered').value) || 0,
        own_goals: parseInt(document.getElementById('stat-own-goals').value) || 0,
        minutes_played: parseInt(document.getElementById('stat-minutes').value) || 0
    };
    
    try {
        showLoading();
        
        // Verificar se já existe
        const { data: existing } = await supabase
            .from('player_stats')
            .select('id')
            .eq('round_id', roundId)
            .eq('player_id', playerId)
            .single();
        
        let result;
        if (existing) {
            // Atualizar
            result = await supabase
                .from('player_stats')
                .update(dados)
                .eq('round_id', roundId)
                .eq('player_id', playerId);
        } else {
            // Inserir
            result = await supabase
                .from('player_stats')
                .insert([dados]);
        }
        
        if (result.error) throw result.error;
        
        alert('✅ Estatísticas salvas! Os pontos foram atualizados automaticamente.');
        
        // Recarregar lista
        await carregarEstatisticasRodada(roundId);
        limparFormularioEstatisticas();
        
    } catch (error) {
        console.error('Erro ao salvar:', error);
        alert('❌ Erro ao salvar estatísticas: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============= EDITAR/DELETAR =============

function editarEstatistica(playerId) {
    const roundId = document.getElementById('stat-round').value;
    
    document.getElementById('stat-player').value = playerId;
    buscarEstatisticaExistente(roundId, playerId);
    
    // Scroll para o formulário
    document.getElementById('form-estatisticas').scrollIntoView({ behavior: 'smooth' });
}

async function deletarEstatistica(playerId, roundId) {
    const player = jogadoresDisponiveis.find(p => p.id == playerId);
    if (!player) return;
    
    if (!confirm(`Deletar estatísticas de ${player.name}?`)) return;
    
    try {
        showLoading();
        
        const { error } = await supabase
            .from('player_stats')
            .delete()
            .eq('player_id', playerId)
            .eq('round_id', roundId);
        
        if (error) throw error;
        
        alert('✅ Estatísticas deletadas!');
        await carregarEstatisticasRodada(roundId);
        
    } catch (error) {
        console.error('Erro ao deletar:', error);
        alert('❌ Erro ao deletar: ' + error.message);
    } finally {
        hideLoading();
    }
}

// ============= UTILITÁRIOS =============

function limparFormularioEstatisticas() {
    document.getElementById('stat-goals').value = 0;
    document.getElementById('stat-assists').value = 0;
    document.getElementById('stat-shots').value = 0;
    document.getElementById('stat-tackles').value = 0;
    document.getElementById('stat-interceptions').value = 0;
    document.getElementById('stat-blocks').value = 0;
    document.getElementById('stat-saves').value = 0;
    document.getElementById('stat-goals-conceded').value = 0;
    document.getElementById('stat-clean-sheet').checked = false;
    document.getElementById('stat-penalty-saved').checked = false;
    document.getElementById('stat-yellow').value = 0;
    document.getElementById('stat-red').value = 0;
    document.getElementById('stat-fouls-committed').value = 0;
    document.getElementById('stat-fouls-suffered').value = 0;
    document.getElementById('stat-own-goals').value = 0;
    document.getElementById('stat-minutes').value = 0;
    document.getElementById('points-preview').textContent = '0.00';
}

// Exportar funções para uso global
window.editarEstatistica = editarEstatistica;
window.deletarEstatistica = deletarEstatistica;