// ========================================
// ANIME CURRENCY CONVERTER - JAVASCRIPT
// Real-time exchange rates
// ========================================

// Configuration
const CONFIG = {
    currencies: ['RUB', 'USD', 'KZT', 'JPY', 'KINDER'],
    baseCurrency: 'USD',
    updateInterval: 5 * 60 * 1000, // 5 minutes
    apiUrl: 'https://api.frankfurter.app/latest',
    kinderPriceRUB: 100 // 1 Kinder Bueno = 100 RUB
};

// State
let exchangeRates = {};
let lastUpdate = null;
let isLoading = false;

// DOM Elements
const inputs = {};
const updateTimeEl = document.getElementById('updateTime');
const luckyBtn = document.getElementById('luckyBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initInputs();
    fetchRates();
    setupAutoUpdate();
    setupLuckyButton();
    loadSavedValues();
});

// Initialize input elements and event listeners
function initInputs() {
    CONFIG.currencies.forEach(currency => {
        const input = document.getElementById(currency);
        if (input) {
            inputs[currency] = input;
            input.addEventListener('input', (e) => handleInput(currency, e.target.value));
            input.addEventListener('focus', () => selectInput(input));
        }
    });
}

// Select all text on focus
function selectInput(input) {
    setTimeout(() => input.select(), 0);
}

// Fetch exchange rates from API
async function fetchRates() {
    if (isLoading) return;
    
    isLoading = true;
    setLoadingState(true);
    
    try {
        // Fetch rates with USD as base
        const response = await fetch(`${CONFIG.apiUrl}?from=USD`);
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        
        // Store rates relative to USD
        exchangeRates = {
            USD: 1,
            ...data.rates
        };
        
        // Add KINDER rate (based on RUB price)
        // 1 KINDER = 100 RUB, so KINDER rate = RUB rate / 100
        if (exchangeRates.RUB) {
            exchangeRates.KINDER = exchangeRates.RUB / CONFIG.kinderPriceRUB;
        }
        
        lastUpdate = new Date();
        updateTimeDisplay();
        saveRatesToLocal();
        
        console.log('Rates updated:', exchangeRates);
        
    } catch (error) {
        console.error('Failed to fetch rates:', error);
        
        // Try to load from localStorage
        const savedRates = localStorage.getItem('exchangeRates');
        if (savedRates) {
            exchangeRates = JSON.parse(savedRates);
            updateTimeEl.textContent = 'Используется кэш';
        } else {
            // Fallback rates (approximate)
            exchangeRates = {
                USD: 1,
                RUB: 92.5,
                KZT: 450,
                JPY: 149,
                KINDER: 0.925 // 92.5 / 100
            };
            updateTimeEl.textContent = 'Офлайн режим';
        }
    } finally {
        isLoading = false;
        setLoadingState(false);
    }
}

// Set loading visual state
function setLoadingState(loading) {
    document.body.classList.toggle('loading', loading);
}

// Update time display
function updateTimeDisplay() {
    if (lastUpdate) {
        const hours = lastUpdate.getHours().toString().padStart(2, '0');
        const minutes = lastUpdate.getMinutes().toString().padStart(2, '0');
        updateTimeEl.textContent = `Курс обновлён: ${hours}:${minutes}`;
    }
}

// Save rates to localStorage
function saveRatesToLocal() {
    localStorage.setItem('exchangeRates', JSON.stringify(exchangeRates));
    localStorage.setItem('lastUpdate', lastUpdate.toISOString());
}

// Setup auto-update interval
function setupAutoUpdate() {
    setInterval(fetchRates, CONFIG.updateInterval);
}

// Handle input change
function handleInput(sourceCurrency, value) {
    // Remove non-numeric characters except decimal point
    const numericValue = parseFloat(value);
    
    if (isNaN(numericValue) || numericValue === 0) {
        // Clear all inputs if invalid or zero
        CONFIG.currencies.forEach(currency => {
            if (currency !== sourceCurrency) {
                inputs[currency].value = '';
            }
        });
        saveCurrentValues();
        return;
    }
    
    // Convert to all other currencies
    convertFromCurrency(sourceCurrency, numericValue);
    saveCurrentValues();
}

// Convert from one currency to all others
function convertFromCurrency(fromCurrency, amount) {
    // First convert to USD (base)
    const amountInUSD = amount / exchangeRates[fromCurrency];
    
    // Then convert USD to all other currencies
    CONFIG.currencies.forEach(toCurrency => {
        if (toCurrency !== fromCurrency) {
            const convertedAmount = amountInUSD * exchangeRates[toCurrency];
            inputs[toCurrency].value = formatNumber(convertedAmount, toCurrency);
            flashInput(toCurrency);
        }
    });
}

// Format number based on currency
function formatNumber(number, currency) {
    // JPY and KZT typically don't use decimals for small amounts
    if (currency === 'JPY' || currency === 'KZT') {
        if (number >= 1) {
            return Math.round(number).toString();
        }
    }
    
    // KINDER - show 2 decimals (can be fractional chocolates!)
    if (currency === 'KINDER') {
        return number.toFixed(2);
    }
    
    // For other currencies, use 2 decimal places
    if (number >= 0.01) {
        return number.toFixed(2);
    }
    
    // For very small numbers, use more precision
    return number.toPrecision(4);
}

// Flash animation on updated inputs
function flashInput(currency) {
    const row = inputs[currency].closest('.currency-row');
    row.classList.remove('flash');
    // Trigger reflow
    void row.offsetWidth;
    row.classList.add('flash');
}

// Save current values to localStorage
function saveCurrentValues() {
    const values = {};
    CONFIG.currencies.forEach(currency => {
        values[currency] = inputs[currency].value;
    });
    localStorage.setItem('savedValues', JSON.stringify(values));
}

// Load saved values from localStorage
function loadSavedValues() {
    const saved = localStorage.getItem('savedValues');
    if (saved) {
        const values = JSON.parse(saved);
        const firstNonEmpty = CONFIG.currencies.find(c => values[c]);
        
        if (firstNonEmpty) {
            inputs[firstNonEmpty].value = values[firstNonEmpty];
            // Wait for rates to load, then convert
            setTimeout(() => {
                if (Object.keys(exchangeRates).length > 0) {
                    handleInput(firstNonEmpty, values[firstNonEmpty]);
                }
            }, 1000);
        }
    }
}

// Setup lucky button
function setupLuckyButton() {
    luckyBtn.addEventListener('click', generateRandomAmount);
}

// Generate random amount and show all conversions
function generateRandomAmount() {
    // Add click animation
    luckyBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        luckyBtn.style.transform = '';
    }, 100);
    
    // Generate random USD amount (base for conversion)
    const randomUSD = Math.floor(Math.random() * 1000) + 1; // 1 - 1001 dollars
    
    // Fill ALL fields with converted values
    CONFIG.currencies.forEach(currency => {
        const convertedAmount = randomUSD * exchangeRates[currency];
        inputs[currency].value = formatNumber(convertedAmount, currency);
        flashInput(currency);
    });
    
    // Save values
    saveCurrentValues();
}

// Utility: Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
