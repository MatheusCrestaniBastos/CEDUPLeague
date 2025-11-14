/**
 * CEDUP League - Sistema de Tema Dark/Light
 */

const THEME_KEY = 'cedup-league-theme';
const THEME_DARK = 'dark';
const THEME_LIGHT = 'light';

// Obter tema salvo
function getSavedTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    
    if (!savedTheme) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? THEME_DARK : THEME_LIGHT;
    }
    
    return savedTheme;
}

// Salvar tema
function saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
}

// Aplicar tema
function applyTheme(theme) {
    const html = document.documentElement;
    
    if (theme === THEME_DARK) {
        html.classList.add('dark');
    } else {
        html.classList.remove('dark');
    }
    
    updateThemeToggleIcon(theme);
}

// Atualizar ícone do botão
function updateThemeToggleIcon(theme) {
    const toggleButton = document.getElementById('theme-toggle');
    if (!toggleButton) return;
    
    if (theme === THEME_DARK) {
        toggleButton.innerHTML = '<span class="text-xl">☀️</span>';
        toggleButton.setAttribute('aria-label', 'Mudar para tema claro');
    } else {
        toggleButton.innerHTML = '<span class="text-xl">🌙</span>';
        toggleButton.setAttribute('aria-label', 'Mudar para tema escuro');
    }
}

// Alternar tema
function toggleTheme() {
    const currentTheme = getSavedTheme();
    const newTheme = currentTheme === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    
    saveTheme(newTheme);
    applyTheme(newTheme);
    
    console.log(`🎨 Tema alterado para: ${newTheme}`);
}

// Inicializar tema
function initTheme() {
    const savedTheme = getSavedTheme();
    applyTheme(savedTheme);
    console.log('🎨 Tema inicializado:', savedTheme);
}

// Configurar listeners
function setupThemeListeners() {
    const toggleButton = document.getElementById('theme-toggle');
    
    if (toggleButton) {
        toggleButton.addEventListener('click', toggleTheme);
        console.log('✅ Listener do botão de tema configurado');
    }
    
    // Listener para mudanças na preferência do sistema
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeMediaQuery.addEventListener('change', (e) => {
        const hasManualPreference = localStorage.getItem(THEME_KEY);
        
        if (!hasManualPreference) {
            const newTheme = e.matches ? THEME_DARK : THEME_LIGHT;
            applyTheme(newTheme);
            console.log('🎨 Tema atualizado pela preferência do sistema:', newTheme);
        }
    });
}

// Inicializar imediatamente
initTheme();

// Configurar listeners quando DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    setupThemeListeners();
});

// Exportar para uso global
window.theme = {
    getSavedTheme,
    saveTheme,
    applyTheme,
    toggleTheme,
    initTheme,
    THEME_DARK,
    THEME_LIGHT
};