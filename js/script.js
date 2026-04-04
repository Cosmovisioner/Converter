// ========================================
// CURRENCY CONVERTER — real-time rates
// CNY + Kinder Bueno (95 ₽) + hero input
// ========================================

const CONFIG = {
    currencies: ['RUB', 'USD', 'KZT', 'CNY', 'KINDER'],
    updateInterval: 5 * 60 * 1000,
    kinderPriceRUB: 95,
    apiSources: [
        { name: 'open.er-api', fetch: fetchOpenErApi },
        { name: 'jsdelivr-currency-api', fetch: fetchJsdelivrCurrencyApi }
    ]
};

let exchangeRates = {};
let lastUpdate = null;
let isLoading = false;

const inputs = {};
let heroAmountEl;
let heroCurrencyEl;
const updateTimeEl = document.getElementById('updateTime');
const luckyBtn = document.getElementById('luckyBtn');

document.addEventListener('DOMContentLoaded', () => {
    heroAmountEl = document.getElementById('heroAmount');
    heroCurrencyEl = document.getElementById('heroCurrency');
    initInputs();
    setupHero();
    fetchRates();
    setupAutoUpdate();
    setupLuckyButton();
    loadSavedValues();
});

function initInputs() {
    CONFIG.currencies.forEach((currency) => {
        const input = document.getElementById(currency);
        if (input) {
            inputs[currency] = input;
            input.addEventListener('input', (e) => handleRowInput(currency, e.target.value));
            input.addEventListener('focus', () => input.select());
        }
    });
}

function setupHero() {
    heroAmountEl.addEventListener('input', () => handleHeroInput());
    heroCurrencyEl.addEventListener('change', () => handleHeroInput());
}

function handleHeroInput() {
    const raw = heroAmountEl.value;
    const currency = heroCurrencyEl.value;
    const numericValue = parseFloat(raw);

    if (raw === '' || raw === '-' || raw === '.') {
        return;
    }

    if (isNaN(numericValue) || numericValue === 0) {
        clearAllAmounts();
        return;
    }

    convertFromCurrency(currency, numericValue);
    flashHero();
    saveCurrentValues();
}

function handleRowInput(sourceCurrency, value) {
    syncHeroFrom(sourceCurrency, value);

    const numericValue = parseFloat(value);

    if (isNaN(numericValue) || numericValue === 0) {
        clearAllAmounts();
        return;
    }

    convertFromCurrency(sourceCurrency, numericValue);
    saveCurrentValues();
}

function syncHeroFrom(currency, value) {
    heroCurrencyEl.value = currency;
    heroAmountEl.value = value;
}

function clearAllAmounts() {
    CONFIG.currencies.forEach((c) => {
        inputs[c].value = '';
    });
    heroAmountEl.value = '';
    localStorage.removeItem('savedValues');
}

async function fetchOpenErApi(signal) {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', { signal });
    if (!response.ok) throw new Error('open.er-api HTTP');
    const data = await response.json();
    if (data.result !== 'success') throw new Error('open.er-api result');
    return normalizeFromUsdRates({
        USD: 1,
        RUB: data.rates.RUB,
        KZT: data.rates.KZT,
        CNY: data.rates.CNY
    });
}

async function fetchJsdelivrCurrencyApi(signal) {
    const response = await fetch(
        'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
        { signal }
    );
    if (!response.ok) throw new Error('jsdelivr HTTP');
    const data = await response.json();
    const usd = data.usd || data.USD;
    if (!usd || typeof usd !== 'object') throw new Error('jsdelivr shape');
    const upper = {};
    Object.keys(usd).forEach((k) => {
        upper[k.toUpperCase()] = usd[k];
    });
    return normalizeFromUsdRates({
        USD: 1,
        RUB: upper.RUB,
        KZT: upper.KZT,
        CNY: upper.CNY
    });
}

function normalizeFromUsdRates(r) {
    if (!r.RUB || !r.CNY || !r.KZT) {
        throw new Error('missing currency in response');
    }
    r.KINDER = r.RUB / CONFIG.kinderPriceRUB;
    return r;
}

async function fetchRates() {
    if (isLoading) return;

    isLoading = true;
    setLoadingState(true);
    updateTimeEl.textContent = 'Загрузка курса...';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let lastError = null;

    try {
        for (const source of CONFIG.apiSources) {
            try {
                exchangeRates = await source.fetch(controller.signal);
                lastUpdate = new Date();
                updateTimeDisplay();
                saveRatesToLocal();
                reapplyCurrentAmount();
                console.log(`Rates from ${source.name}:`, exchangeRates);
                lastError = null;
                break;
            } catch (e) {
                lastError = e;
                console.warn(`${source.name} failed:`, e);
            }
        }

        if (lastError) {
            throw lastError;
        }
    } catch (error) {
        console.error('All rate sources failed:', error);

        const savedRates = localStorage.getItem('exchangeRates');
        const savedTime = localStorage.getItem('lastUpdate');

        if (savedRates) {
            exchangeRates = JSON.parse(savedRates);
            if (exchangeRates.JPY != null && exchangeRates.CNY == null) {
                exchangeRates.CNY = exchangeRates.JPY;
            }
            delete exchangeRates.JPY;
            if (exchangeRates.RUB) {
                exchangeRates.KINDER = exchangeRates.RUB / CONFIG.kinderPriceRUB;
            }
            if (savedTime) {
                const date = new Date(savedTime);
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                updateTimeEl.textContent = `Кэш от ${hours}:${minutes}`;
            } else {
                updateTimeEl.textContent = 'Используется кэш';
            }
            reapplyCurrentAmount();
        } else {
            exchangeRates = {
                USD: 1,
                RUB: 95,
                KZT: 500,
                CNY: 7.2,
                KINDER: 95 / CONFIG.kinderPriceRUB
            };
            updateTimeEl.textContent = 'Курс примерный';
            reapplyCurrentAmount();
        }
    } finally {
        clearTimeout(timeoutId);
        isLoading = false;
        setLoadingState(false);
    }
}

function reapplyCurrentAmount() {
    const heroRaw = heroAmountEl.value;
    const heroCur = heroCurrencyEl.value;
    const n = parseFloat(heroRaw);
    if (heroRaw !== '' && !isNaN(n) && n !== 0) {
        convertFromCurrency(heroCur, n);
        return;
    }

    const first = CONFIG.currencies.find((c) => inputs[c].value);
    if (first) {
        const v = parseFloat(inputs[first].value);
        if (!isNaN(v) && v !== 0) {
            syncHeroFrom(first, inputs[first].value);
            convertFromCurrency(first, v);
        }
    }
}

function setLoadingState(loading) {
    document.body.classList.toggle('loading', loading);
}

function updateTimeDisplay() {
    if (lastUpdate) {
        const hours = lastUpdate.getHours().toString().padStart(2, '0');
        const minutes = lastUpdate.getMinutes().toString().padStart(2, '0');
        updateTimeEl.textContent = `Курс обновлён: ${hours}:${minutes}`;
    }
}

function saveRatesToLocal() {
    localStorage.setItem('exchangeRates', JSON.stringify(exchangeRates));
    localStorage.setItem('lastUpdate', lastUpdate.toISOString());
}

function setupAutoUpdate() {
    setInterval(fetchRates, CONFIG.updateInterval);
}

function convertFromCurrency(fromCurrency, amount) {
    const rate = exchangeRates[fromCurrency];
    if (rate == null || rate === 0) return;

    const amountInUSD = amount / rate;

    CONFIG.currencies.forEach((toCurrency) => {
        if (toCurrency !== fromCurrency) {
            const converted = amountInUSD * exchangeRates[toCurrency];
            inputs[toCurrency].value = formatNumber(converted, toCurrency);
            flashInput(toCurrency);
        } else {
            inputs[toCurrency].value = formatNumber(amount, toCurrency);
        }
    });
}

function formatNumber(number, currency) {
    if (currency === 'KZT') {
        if (number >= 1) return Math.round(number).toString();
    }

    if (currency === 'KINDER') {
        return number.toFixed(2);
    }

    if (currency === 'CNY' || currency === 'USD' || currency === 'RUB') {
        if (number >= 0.01) return number.toFixed(2);
    }

    if (number >= 0.01) return number.toFixed(2);

    return number.toPrecision(4);
}

function flashInput(currency) {
    const row = inputs[currency].closest('.currency-row');
    if (!row) return;
    row.classList.remove('flash');
    void row.offsetWidth;
    row.classList.add('flash');
}

function flashHero() {
    const panel = document.querySelector('.hero-panel');
    if (!panel) return;
    panel.classList.remove('flash');
    void panel.offsetWidth;
    panel.classList.add('flash');
}

function saveCurrentValues() {
    const values = { heroCurrency: heroCurrencyEl.value, heroAmount: heroAmountEl.value };
    CONFIG.currencies.forEach((currency) => {
        values[currency] = inputs[currency].value;
    });
    localStorage.setItem('savedValues', JSON.stringify(values));
}

function loadSavedValues() {
    const saved = localStorage.getItem('savedValues');
    if (!saved) return;

    let values;
    try {
        values = JSON.parse(saved);
    } catch {
        return;
    }

    if (values.JPY != null && values.CNY == null) {
        values.CNY = values.JPY;
        delete values.JPY;
    }

    if (values.heroAmount != null && values.heroCurrency) {
        heroCurrencyEl.value = values.heroCurrency;
        heroAmountEl.value = values.heroAmount;
        return;
    }

    const first = CONFIG.currencies.find((c) => values[c]);
    if (first) {
        inputs[first].value = values[first];
        syncHeroFrom(first, values[first]);
    }
}

function setupLuckyButton() {
    luckyBtn.addEventListener('click', generateRandomAmount);
}

function generateRandomAmount() {
    luckyBtn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        luckyBtn.style.transform = '';
    }, 100);

    const randomUSD = Math.floor(Math.random() * 1000) + 1;

    heroCurrencyEl.value = 'USD';
    heroAmountEl.value = String(randomUSD);

    CONFIG.currencies.forEach((currency) => {
        const converted = randomUSD * exchangeRates[currency];
        inputs[currency].value = formatNumber(converted, currency);
        flashInput(currency);
    });

    flashHero();
    saveCurrentValues();
}
