// API Configuration
const API_BASE_URL = 'http://localhost:8000';
let currentSearch = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAPIStatus();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Enter key on search input
    document.getElementById('searchQuery').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

// Check API status
async function checkAPIStatus() {
    const statusIndicator = document.getElementById('apiStatus');
    const apiUrl = document.getElementById('apiUrl');
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            statusIndicator.textContent = 'Conectado';
            statusIndicator.style.color = '#42b883';
            apiUrl.textContent = `(${API_BASE_URL})`;
        } else {
            throw new Error('API offline');
        }
    } catch (error) {
        statusIndicator.textContent = 'Desconectado';
        statusIndicator.style.color = '#ef4444';
        apiUrl.textContent = '- Verifique o backend';
    }
}

// Perform search - VERSÃO CORRIGIDA
async function performSearch() {
    const query = document.getElementById('searchQuery').value.trim();
    if (!query) {
        alert('Por favor, digite um termo de busca');
        return;
    }

    const depth = document.getElementById('searchDepth').value;
    
    // Armazena a busca atual para o botão "Tentar novamente"
    currentSearch = { query, depth };

    // Reseta a interface
    hideAllStates();
    showLoadingState();

    try {
        // Cria o corpo da requisição (body) para o método POST
        const requestBody = {
            query: query,
            depth: depth,
            filters: null
        };

        // Faz a requisição POST para o endpoint correto (/api/search)
        const response = await fetch(`${API_BASE_URL}/api/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: `HTTP error! status: ${response.status}` }));
            throw new Error(errorData.detail);
        }

        const data = await response.json();

        // Lida com os resultados
        if (data.needs_manual_solve) {
            showCaptchaWarning();
        } else if (data.ads && data.ads.length > 0) {
            displayResults(data); 
        } else {
            showNoResults();
        }

    } catch (error) {
        showError(error.message);
    }
}


// Retry search
function retrySearch() {
    if (currentSearch) {
        document.getElementById('searchQuery').value = currentSearch.query;
        document.getElementById('searchDepth').value = currentSearch.depth;
        performSearch();
    }
}

// Display results
function displayResults(data) {
    hideAllStates();
    
    // A resposta do backend não tem mais 'total_results' ou 'filtered_results'
    // Vamos usar o tamanho da lista de anúncios
    document.getElementById('totalResults').textContent = data.total_found;
    document.getElementById('filteredResults').textContent = data.ads.length;
    
    // A resposta do backend não tem mais 'is_probable_dropshipping'
    // Vamos comentar essa linha por enquanto
    // const dropshippingCount = data.ads.filter(ad => ad.is_probable_dropshipping).length;
    // document.getElementById('dropshippingCount').textContent = dropshippingCount;
    document.getElementById('dropshippingCount').textContent = "N/A";


    document.getElementById('resultsSummary').classList.remove('hidden');
    
    const grid = document.getElementById('resultsGrid');
    grid.innerHTML = '';
    
    data.ads.forEach(ad => {
        const card = createAdCard(ad);
        grid.appendChild(card);
    });
    
    grid.classList.remove('hidden');
}

// Create ad card
function createAdCard(ad) {
    const card = document.createElement('div');
    card.className = 'ad-card';
    
    // O backend não calcula mais o score, vamos usar um valor fixo ou remover
    const score = 50; // valor fixo
    let scoreClass = 'score-medium';
    if (score >= 70) scoreClass = 'score-high';
    else if (score < 40) scoreClass = 'score-low';
    
    let landingDisplay = 'Não disponível';
    if (ad.landing_url) {
        try {
            const url = new URL(ad.landing_url);
            landingDisplay = url.hostname.replace('www.', '');
        } catch {
            landingDisplay = ad.landing_url.substring(0, 30) + '...';
        }
    }
    
    card.innerHTML = `
        <div class="ad-header">
            <div class="advertiser-info">
                <h3>${ad.advertiser_name}</h3>
                <div class="advertiser-url">${ad.advertiser_active_ads_est} anúncios ativos</div>
            </div>
            <div class="score-badge ${scoreClass}">
                ${score.toFixed(1)}
            </div>
        </div>
        
        <div class="ad-content">
            <div class="ad-text">${truncateText(ad.text, 150)}</div>
        </div>
        
        <div class="ad-meta">
            <div class="meta-item">
                <span class="icon">📅</span>
                <span>${ad.days_active} dias ativo</span>
            </div>
            <div class="meta-item">
                <span class="icon">🎨</span>
                <span>${ad.variations_count} variações</span>
            </div>
            <div class="meta-item">
                <span class="icon">🔗</span>
                <span>${landingDisplay}</span>
            </div>
        </div>
    `;
    
    // card.onclick = () => showAdDetails(ad); // O modal pode ser reativado depois
    
    return card;
}

// UI State Management Functions
function hideAllStates() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    // A ID correta no HTML era captchaWarning
    document.getElementById('captchaWarning').classList.add('hidden');
    document.getElementById('resultsSummary').classList.add('hidden');
    document.getElementById('resultsGrid').classList.add('hidden');
    document.getElementById('noResults').classList.add('hidden');
}

function showLoadingState() {
    document.getElementById('loadingState').classList.remove('hidden');
}

function showError(message) {
    hideAllStates();
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorState').classList.remove('hidden');
}

function showCaptchaWarning() {
    hideAllStates();
    document.getElementById('captchaWarning').classList.remove('hidden');
}

function showNoResults() {
    hideAllStates();
    document.getElementById('noResults').classList.remove('hidden');
}

// Utility functions
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || '';
    return text.substring(0, maxLength) + '...';
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
}
