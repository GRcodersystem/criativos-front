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
            statusIndicator.style.color = '#42b883';
            apiUrl.textContent = `Conectado (${API_BASE_URL})`;
        } else {
            throw new Error('API offline');
        }
    } catch (error) {
        statusIndicator.style.color = '#ef4444';
        apiUrl.textContent = 'Desconectado - Verifique o backend';
    }
}

//performSearch atualizada
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
            filters: null // Os filtros mais complexos não estão nesta versão
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
            // A resposta do backend agora está aninhada, precisamos usar data.ads
            // Vamos passar o objeto de resposta completo para displayResults
            displayResults(data); 
        } else {
            showNoResults();
        }

    } catch (error) {
        showError(error.message);
    }
}
    
    // Get filter values
    const depth = document.getElementById('searchDepth').value;
    const excludeMarketplaces = document.getElementById('excludeMarketplaces').checked;
    const minDays = parseInt(document.getElementById('minDays').value) || 0;
    const minAds = parseInt(document.getElementById('minAds').value) || 0;
    
    // Store current search
    currentSearch = { query, depth, excludeMarketplaces, minDays, minAds };
    
    // Reset UI
    hideAllStates();
    showLoadingState();
    
    try {
        // Build query string
        const params = new URLSearchParams({
            query,
            depth,
            exclude_marketplaces: excludeMarketplaces,
            min_days: minDays,
            min_active_ads: minAds
        });
        
        // Make API request
        const response = await fetch(`${API_BASE_URL}/search?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle results
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
        document.getElementById('excludeMarketplaces').checked = currentSearch.excludeMarketplaces;
        document.getElementById('minDays').value = currentSearch.minDays;
        document.getElementById('minAds').value = currentSearch.minAds;
        performSearch();
    }
}

// Display results
function displayResults(data) {
    hideAllStates();
    
    // Update summary
    document.getElementById('totalResults').textContent = data.total_results;
    document.getElementById('filteredResults').textContent = data.filtered_results;
    
    const dropshippingCount = data.ads.filter(ad => ad.is_probable_dropshipping).length;
    document.getElementById('dropshippingCount').textContent = dropshippingCount;
    
    document.getElementById('resultsSummary').classList.remove('hidden');
    
    // Build results grid
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
    
    // Determine score class
    let scoreClass = 'score-low';
    if (ad.score >= 70) scoreClass = 'score-high';
    else if (ad.score >= 40) scoreClass = 'score-medium';
    
    // Format landing URL display
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
                ${ad.score.toFixed(1)}
            </div>
        </div>
        
        <div class="ad-content">
            ${ad.headline ? `<div class="ad-headline">${ad.headline}</div>` : ''}
            ${ad.text ? `<div class="ad-text">${truncateText(ad.text, 150)}</div>` : ''}
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
                <span class="icon">${ad.media_type === 'video' ? '🎥' : '🖼️'}</span>
                <span>${ad.media_type === 'video' ? 'Vídeo' : 'Imagem'}</span>
            </div>
            <div class="meta-item">
                <span class="icon">🔗</span>
                <span>${landingDisplay}</span>
            </div>
            ${ad.is_probable_dropshipping ? 
                '<span class="tag tag-dropshipping">Provável Dropshipping</span>' : ''}
        </div>
    `;
    
    // Add click handler
    card.onclick = () => showAdDetails(ad);
    
    return card;
}

// Show ad details in modal
function showAdDetails(ad) {
    const modal = document.getElementById('adModal');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = `
        <h2>${ad.advertiser_name}</h2>
        
        <div style="margin: 1.5rem 0;">
            <h3>Informações do Anúncio</h3>
            <table style="width: 100%; margin-top: 1rem;">
                <tr>
                    <td><strong>ID do Anúncio:</strong></td>
                    <td>${ad.ad_id}</td>
                </tr>
                <tr>
                    <td><strong>Score:</strong></td>
                    <td>${ad.score.toFixed(2)}</td>
                </tr>
                <tr>
                    <td><strong>Dias Ativo:</strong></td>
                    <td>${ad.days_active}</td>
                </tr>
                <tr>
                    <td><strong>Data de Início:</strong></td>
                    <td>${formatDate(ad.start_date)}</td>
                </tr>
                <tr>
                    <td><strong>Variações:</strong></td>
                    <td>${ad.variations_count}</td>
                </tr>
                <tr>
                    <td><strong>Anúncios do Anunciante:</strong></td>
                    <td>${ad.advertiser_active_ads_est}</td>
                </tr>
                <tr>
                    <td><strong>Tipo de Mídia:</strong></td>
                    <td>${ad.media_type}</td>
                </tr>
            </table>
        </div>
        
        ${ad.headline ? `
        <div style="margin: 1.5rem 0;">
            <h3>Título</h3>
            <p style="margin-top: 0.5rem;">${ad.headline}</p>
        </div>
        ` : ''}
        
        ${ad.text ? `
        <div style="margin: 1.5rem 0;">
            <h3>Texto</h3>
            <p style="margin-top: 0.5rem; white-space: pre-wrap;">${ad.text}</p>
        </div>
        ` : ''}
        
        <div style="margin: 1.5rem 0;">
            <h3>URLs</h3>
            <p style="margin-top: 0.5rem;">
                <strong>Landing Page:</strong> 
                ${ad.landing_url ? 
                    `<a href="${ad.landing_url}" target="_blank" style="color: #1877f2;">${ad.landing_url}</a>` : 
                    'Não disponível'}
            </p>
            <p style="margin-top: 0.5rem;">
                <strong>Facebook Ads Library:</strong> 
                <a href="${ad.ad_library_result_url}" target="_blank" style="color: #1877f2;">
                    Ver no Ads Library
                </a>
            </p>
        </div>
        
        <div style="margin: 1.5rem 0;">
            <h3>Análise</h3>
            <p style="margin-top: 0.5rem;">
                ${ad.is_probable_dropshipping ? 
                    '✅ <strong>Provável loja de dropshipping</strong> (padrões identificados na URL)' : 
                    '❓ <strong>Não identificado como dropshipping</strong>'}
            </p>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

// Close modal
function closeModal() {
    document.getElementById('adModal').classList.add('hidden');
}

// Window click to close modal
window.onclick = function(event) {
    const modal = document.getElementById('adModal');
    if (event.target == modal) {
        closeModal();
    }
}

// UI State Management
function hideAllStates() {
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
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
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
}
