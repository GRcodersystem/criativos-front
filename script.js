// script.js - Versão Final
const API_BASE_URL = 'http://localhost:8000';
let currentSearch = null;

document.addEventListener('DOMContentLoaded', async () => {
    await checkAPIStatus();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('searchQuery').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

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

async function performSearch() {
    const query = document.getElementById('searchQuery').value.trim();
    if (!query) {
        alert('Por favor, digite um termo de busca');
        return;
    }
    const depth = document.getElementById('searchDepth').value;
    currentSearch = { query, depth };

    hideAllStates();
    showLoadingState();

    try {
        const requestBody = {
            query: query,
            depth: depth,
            filters: null
        };

        const response = await fetch(`${API_BASE_URL}/api/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: `HTTP error! status: ${response.status}` }));
            throw new Error(errorData.detail);
        }

        const data = await response.json();

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

// O restante do seu script.js (displayResults, createAdCard, etc.) provavelmente está correto,
// mas certifique-se de que ele está completo e sem erros de sintaxe.
// Cole o resto do seu script aqui, se quiser que eu verifique.
// ... (cole o resto das funções aqui)
