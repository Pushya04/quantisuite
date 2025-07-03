// ================= WEATHER MODULE =================
// Fetches weather data for a given city (optionally with country code)
async function fetchWeather(city, countryCode = '') {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}${countryCode ? `&country=${countryCode}` : ''}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();
    if (!geoData.results || geoData.results.length === 0) {
        throw new Error('City not found');
    }
    const { latitude, longitude, name, country } = geoData.results[0];
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    const weatherRes = await fetch(weatherUrl);
    const weatherData = await weatherRes.json();
    if (!weatherData.current_weather) {
        throw new Error('Weather data not available');
    }
    return {
        city: name,
        country,
        temperature: weatherData.current_weather.temperature,
        windspeed: weatherData.current_weather.windspeed,
        weathercode: weatherData.current_weather.weathercode,
        time: weatherData.current_weather.time
    };
}

// Displays weather info in the weather tab
async function showWeather(city) {
    const weatherBox = document.getElementById('weather-box');
    weatherBox.textContent = 'Loading...';
    try {
        const data = await fetchWeather(city);
        weatherBox.innerHTML = `<b>${data.city}, ${data.country}</b><br>
            Temp: ${data.temperature}&deg;C<br>
            Wind: ${data.windspeed} km/h<br>
            Time: ${data.time}`;
    } catch (e) {
        weatherBox.textContent = 'Error: ' + e.message;
    }
}
window.fetchWeather = fetchWeather;
window.showWeather = showWeather;

// ================= GLOBAL STATE & CONSTANTS =================
"use strict";
let currentTab = 'simple'; // Tracks the current active tab
let angleMode = 'RAD'; // 'RAD' or 'DEG' for scientific calculator
let calculationHistory = []; // Stores calculation history

// Data for all unit converters
const converterData = {
    length: { name: 'Length', icon: 'fa-ruler', baseUnit: 'm', units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.34 }},
    area: { name: 'Area', icon: 'fa-square', baseUnit: 'm²', units: { 'm²': 1, 'km²': 1e6, 'cm²': 1e-4, 'hectare': 10000, 'acre': 4046.86, 'ft²': 0.092903 }},
    volume: { name: 'Volume', icon: 'fa-cube', baseUnit: 'l', units: { l: 1, ml: 0.001, 'm³': 1000, 'gal': 3.78541, 'fl oz': 0.0295735 }},
    mass: { name: 'Mass', icon: 'fa-weight', baseUnit: 'kg', units: { kg: 1, g: 0.001, ton: 1000, lb: 0.453592, oz: 0.0283495 }},
    temperature: { name: 'Temperature', icon: 'fa-thermometer-half', type: 'special' },
    data: { name: 'Data', icon: 'fa-hdd', baseUnit: 'bytes', units: { bytes: 1, KB: 1024, MB: 1024**2, GB: 1024**3, TB: 1024**4, bits: 0.125 }},
    speed: { name: 'Speed', icon: 'fa-tachometer-alt', baseUnit: 'm/s', units: { 'm/s': 1, 'km/h': 0.277778, mph: 0.44704, knot: 0.514444 }},
    time: { name: 'Time', icon: 'fa-clock', baseUnit: 's', units: { s: 1, min: 60, h: 3600, day: 86400, week: 604800 }},
    interest: { name: 'Interest', icon: 'fa-percent', type: 'interest' }
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    // Set default theme if not set
    if (!document.body.classList.contains('theme-dark') && !document.body.classList.contains('theme-light')) {
        document.body.classList.add('theme-dark'); // Default to dark mode, change to 'theme-light' if you prefer
    }
    loadHistoryFromStorage();
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    showTab('simple'); // Set the default tab
    createDynamicConverters();
    renderHistory();
    updateHistoryStats();
    console.log('Professional Calculator Suite Initialized.');
}

function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            showTab(this.dataset.tab);
        });
    });

    // Theme toggle
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (document.body.classList.contains('theme-dark')) {
                document.body.classList.remove('theme-dark');
                document.body.classList.add('theme-light');
            } else {
                document.body.classList.remove('theme-light');
                document.body.classList.add('theme-dark');
            }
        });
    });

    // History search and filter
    document.getElementById('history-search').addEventListener('input', (e) => renderHistory(e.target.value));
    document.getElementById('history-filter').addEventListener('change', () => renderHistory());

    // Keyboard support for calculators
    document.addEventListener('keydown', handleKeyboardInput);
}

// ===== TAB AND UI MANAGEMENT =====
function showTab(tabId) {
    currentTab = tabId;

    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabId}-tab`).classList.add('active');

    // Only show history for simple and scientific calculators
    const historySidebar = document.getElementById('history-sidebar');
    if (tabId === 'simple' || tabId === 'scientific') {
        historySidebar.style.display = 'flex';
    } else {
        historySidebar.style.display = 'none';
    }
}

function addButtonFeedback(button) {
    if (!button) return;
    button.classList.add('active');
    setTimeout(() => button.classList.remove('active'), 150);
}

// ===== CORE CALCULATOR FUNCTIONS =====
function append(calculatorType, value) {
    const display = document.getElementById(`${calculatorType}-display`);
    if (display.value === '0' || display.value === 'Error') {
        display.value = '';
        display.style.color = 'var(--text-primary)';
    }
    display.value += value;
    addButtonFeedback(event.target);
}

function clearDisplay(calculatorType) {
    const display = document.getElementById(`${calculatorType}-display`);
    display.value = '0';
    display.style.color = 'var(--text-primary)';
    document.getElementById(`${calculatorType}-preview`).textContent = '';
    addButtonFeedback(event.target);
}

function backspace(calculatorType) {
    const display = document.getElementById(`${calculatorType}-display`);
    display.value = display.value.slice(0, -1) || '0';
    display.style.color = 'var(--text-primary)';
    addButtonFeedback(event.target);
}

function calculate(calculatorType) {
    const display = document.getElementById(`${calculatorType}-display`);
    const preview = document.getElementById(`${calculatorType}-preview`);
    const expression = display.value;

    if (!expression || expression === 'Error') return;

    try {
        let result;
        if (calculatorType === 'scientific') {
            result = evaluateScientificExpression(expression);
        } else {
            result = evaluateSimpleExpression(expression);
        }

        if (!isFinite(result)) throw new Error("Result is not finite");

        const formattedResult = Number(result.toPrecision(14)).toString();
        display.value = formattedResult;
        display.style.color = 'var(--text-primary)';
        addToHistory(expression, formattedResult, calculatorType);

    } catch (error) {
        console.error('Calculation Error:', error);
        display.value = 'Error';
        display.style.color = 'red'; // Display error in red
    } finally {
        preview.textContent = '';
        addButtonFeedback(event.target);
    }
}

function evaluateSimpleExpression(expression) {
    const sanitized = expression.replace(/[^-()\d/*+.]/g, '');
    return Function(`"use strict"; return (${sanitized})`)();
}

// CORRECTED evaluateScientificExpression function
function evaluateScientificExpression(expression) {
    const factorial = (n) => {
        if (n < 0 || !Number.isInteger(n)) throw new Error("Factorial undefined for non-integers.");
        if (n > 1000) throw new Error("Number too large for factorial.");
        if (n === 0 || n === 1) return 1;
        let res = BigInt(1);
        for (let i = 2; i <= n; i++) res *= BigInt(i);
        return Number(res);
    };

    let evalExpression = expression
        .replace(/PI/g, 'Math.PI')
        .replace(/E/g, 'Math.E')
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/RND/g, 'Math.random()');

    // Handle absolute value
    evalExpression = evalExpression.replace(/\|([^|]+)\|/g, 'Math.abs($1)');
    evalExpression = evalExpression.replace(/\|x\|/g, 'Math.abs(x)');

    // Power operations
    evalExpression = evalExpression.replace(/pow\(([^,]+),([^\)]+)\)/g, 'Math.pow($1,$2)');
    evalExpression = evalExpression.replace(/\(([^)]+)\)\s*\^\s*\(([^)]+)\)/g, 'Math.pow(($1),($2))');
    evalExpression = evalExpression.replace(/(\d+(?:\.\d+)?)\s*\^\s*(\d+(?:\.\d+)?)/g, 'Math.pow($1,$2)');
    evalExpression = evalExpression.replace(/(\d+(?:\.\d+)?)\s*\^\s*\(([^)]+)\)/g, 'Math.pow($1,($2))');
    evalExpression = evalExpression.replace(/(\d+)pow\(([^)]+)\)/g, 'Math.pow($1,$2)');
    evalExpression = evalExpression.replace(/(\d+)pow(\d+)/g, 'Math.pow($1,$2)');

    // Exponential
    evalExpression = evalExpression.replace(/eˣ/g, 'Math.exp');
    evalExpression = evalExpression.replace(/exp\(/g, 'Math.exp(');
    evalExpression = evalExpression.replace(/e\^/g, 'Math.exp(');

    // Square/cube roots
    evalExpression = evalExpression.replace(/sqrt\(/g, 'Math.sqrt(');
    evalExpression = evalExpression.replace(/cbrt\(/g, 'Math.cbrt(');
    evalExpression = evalExpression.replace(/(\d+)sqrt(\d+(?:\.\d+)?)/g, '($1*Math.sqrt($2))');
    evalExpression = evalExpression.replace(/(\d+)cbrt(\d+(?:\.\d+)?)/g, '($1*Math.cbrt($2))');
    evalExpression = evalExpression.replace(/√\(/g, 'Math.sqrt(');
    evalExpression = evalExpression.replace(/∛\(/g, 'Math.cbrt(');
    evalExpression = evalExpression.replace(/√(\d+(?:\.\d+)?)/g, 'Math.sqrt($1)');
    evalExpression = evalExpression.replace(/∛(\d+(?:\.\d+)?)/g, 'Math.cbrt($1)');

    // Inverse trig functions (FIRST, with argument protection)
    evalExpression = evalExpression
        .replace(/arcsin\(/g, 'Math.asin(')
        .replace(/arccos\(/g, 'Math.acos(')
        .replace(/arctan\(/g, 'Math.atan(')
        .replace(/sin⁻¹\(/g, 'Math.asin(')
        .replace(/cos⁻¹\(/g, 'Math.acos(')
        .replace(/tan⁻¹\(/g, 'Math.atan(')
        .replace(/asin\(/g, 'Math.asin(')
        .replace(/acos\(/g, 'Math.acos(')
        .replace(/atan\(/g, 'Math.atan(');

    // Patch: wrap arguments to asin/acos/atan in parseFloat to avoid string input errors
    evalExpression = evalExpression
        .replace(/Math\.asin\(([^)]+)\)/g, function(match, p1) { return `Math.asin(parseFloat(${p1}))`; })
        .replace(/Math\.acos\(([^)]+)\)/g, function(match, p1) { return `Math.acos(parseFloat(${p1}))`; })
        .replace(/Math\.atan\(([^)]+)\)/g, function(match, p1) { return `Math.atan(parseFloat(${p1}))`; });

    // --- LOGARITHMS ---
    // log(x, y) with comma (allow whitespace): log(8,2) => Math.log(8)/Math.log(2)
    evalExpression = evalExpression.replace(/log\(([^,()]+)\s*,\s*([^)]+)\)/g, '(Math.log($1)/Math.log($2))');
    // log(x) (base 10): log(100) => Math.log(100)/Math.LN10
    evalExpression = evalExpression.replace(/log\(([^)]+)\)/g, '(Math.log($1)/Math.LN10)');
    // ln(x): ln(5) => Math.log(5)
    evalExpression = evalExpression.replace(/ln\(/g, 'Math.log(');

    // Regular trig
    evalExpression = evalExpression
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(');

    // Implicit multiplication
    evalExpression = evalExpression
        .replace(/(\d+)(PI|E|Math\.PI|Math\.E)/g, '$1*$2')
        .replace(/(\d+)(asin|acos|atan|sin|cos|tan|log|ln|sqrt|abs|exp|Math\.[a-zA-Z]+)/g, '$1*$2')
        .replace(/(\d+)Math\.(sqrt|cbrt|abs|exp|sin|cos|tan|asin|acos|atan|log|log10)\(/g, '$1*Math.$2(')
        .replace(/(\d+)\(/g, '$1*(')
        .replace(/\)(\d+)/g, ')*$1')
        .replace(/\)(Math\.[a-zA-Z]+)/g, ')*$1');

    // Percentage
    evalExpression = evalExpression.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)');
    // Factorial
    evalExpression = evalExpression.replace(/(\d+)!/g, (match, num) => `factorial(${num})`);
    // Reciprocal
    evalExpression = evalExpression.replace(/1\/x/g, '(1/x)');

    // --- DEGREE CONVERSION FOR TRIG (ONLY IF DEG) ---
    if (angleMode === 'DEG') {
        evalExpression = evalExpression
            .replace(/Math\.sin\(([^)]+)\)/g, 'Math.sin(Math.PI / 180 * ($1))')
            .replace(/Math\.cos\(([^)]+)\)/g, 'Math.cos(Math.PI / 180 * ($1))')
            .replace(/Math\.tan\(([^)]+)\)/g, 'Math.tan(Math.PI / 180 * ($1))');
        // Inverse trig degree conversion must be last!
        evalExpression = evalExpression
            .replace(/Math\.asin\(([^)]+)\)/g, '(180 / Math.PI * Math.asin($1))')
            .replace(/Math\.acos\(([^)]+)\)/g, '(180 / Math.PI * Math.acos($1))')
            .replace(/Math\.atan\(([^)]+)\)/g, '(180 / Math.PI * Math.atan($1))');
    }

    // Debug output
    console.log('Original expression:', expression);
    console.log('Processed expression:', evalExpression);

    return Function('factorial', `"use strict"; return ${evalExpression}`)(factorial);
}

// ADD these helper functions for better button handling
function insertAbsoluteValue(calculatorType) {
    const display = document.getElementById(`${calculatorType}-display`);
    const cursorPos = display.selectionStart || display.value.length;
    const before = display.value.substring(0, cursorPos);
    const after = display.value.substring(cursorPos);
    display.value = before + '|' + after + '|';
    // Position cursor between the bars
    display.setSelectionRange(cursorPos + 1, cursorPos + 1);
    display.focus();
}

function insertPower(calculatorType) {
    append(calculatorType, '^');
}

function insertLog(calculatorType) {
    append(calculatorType, 'log(');

// Insert log_b(x) for custom base log
function insertLogBase(calculatorType) {
    append(calculatorType, 'log_(');
}
}

function insertLn(calculatorType) {
    append(calculatorType, 'ln(');
}

// ADD these additional helper functions for the problematic operations
function insertSqrt(calculatorType) {
    append(calculatorType, 'sqrt(');
}

function insertCbrt(calculatorType) {
    append(calculatorType, 'cbrt(');
}

function insertAsin(calculatorType) {
    append(calculatorType, 'asin(');
}

function insertAcos(calculatorType) {
    append(calculatorType, 'acos(');
}

function insertAtan(calculatorType) {
    append(calculatorType, 'atan(');
}

// Alternative functions for symbol-based input
function insertSqrtSymbol(calculatorType) {
    append(calculatorType, '√(');
}

function insertCbrtSymbol(calculatorType) {
    append(calculatorType, '∛(');
}
function toggleAngleMode() {
    const angleModeBtn = document.getElementById('angle-mode');
    angleMode = (angleMode === 'RAD') ? 'DEG' : 'RAD';
    angleModeBtn.textContent = angleMode;
}

// ===== HISTORY MANAGEMENT =====
function addToHistory(expression, result, type) {
    const entry = {
        expression,
        result,
        type,
        timestamp: new Date().toISOString()
    };
    calculationHistory.unshift(entry);
    if (calculationHistory.length > 200) {
        calculationHistory.pop();
    }
    saveHistoryToStorage();
    renderHistory();
    updateHistoryStats();
}

function renderHistory(searchTerm = '') {
    const historyList = document.getElementById('history-list');
    const filterType = document.getElementById('history-filter').value;
    historyList.innerHTML = '';

    let filtered = [...calculationHistory];

    if (filterType !== 'all') {
        const now = new Date();
        if (filterType === 'today') {
            filtered = filtered.filter(item => new Date(item.timestamp).toDateString() === now.toDateString());
        } else if (filterType === 'week') {
            const oneWeekAgo = new Date(now.setDate(now.getDate() - 7));
            filtered = filtered.filter(item => new Date(item.timestamp) >= oneWeekAgo);
        } else {
            filtered = filtered.filter(item => item.type === filterType);
        }
    }

    if (searchTerm) {
    const lowerCaseTerm = searchTerm.toLowerCase();
    filtered = filtered.filter(item => {
        const dateString = new Date(item.timestamp).toLocaleDateString();
        return item.expression.toLowerCase().includes(lowerCaseTerm) ||
               item.result.toLowerCase().includes(lowerCaseTerm) ||
               dateString.includes(lowerCaseTerm);
    });
}

    if (filtered.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-calculator"></i>
                <p>No matching history</p>
                <small>Try a different filter or search</small>
            </div>`;
        return;
    }

    filtered.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'history-item';
        itemEl.innerHTML = `
            <div class="history-expression">${item.expression}</div>
            <div class="history-result">= ${item.result}</div>
            <div class="history-meta">
                <span class="history-type">${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</span>
                <span class="history-date">${new Date(item.timestamp).toLocaleString()}</span>
            </div>
        `;
        historyList.appendChild(itemEl);
    });
}

function updateHistoryStats() {
    document.getElementById('total-calculations').textContent = calculationHistory.length;
    const todayCount = calculationHistory.filter(item => new Date(item.timestamp).toDateString() === new Date().toDateString()).length;
    document.getElementById('today-calculations').textContent = todayCount;
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all history? This action cannot be undone.')) {
        calculationHistory = [];
        saveHistoryToStorage();
        renderHistory();
        updateHistoryStats();
    }
}

function exportHistory() {
    if (calculationHistory.length === 0) {
        alert("History is empty. Nothing to export.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Timestamp,Type,Expression,Result\n";
    calculationHistory.forEach(item => {
        const row = [
            `"${new Date(item.timestamp).toLocaleString()}"`,
            item.type,
            `"${item.expression.replace(/"/g, '""')}"`,
            `"${item.result}"`
        ].join(",");
        csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "calculator_history.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function saveHistoryToStorage() {
    localStorage.setItem('pro-calc-history', JSON.stringify(calculationHistory));
}

function loadHistoryFromStorage() {
    const saved = localStorage.getItem('pro-calc-history');
    if (saved) {
        calculationHistory = JSON.parse(saved);
    }
}

// ===== UNIT CONVERTER DYNAMIC GENERATION AND LOGIC =====
function createDynamicConverters() {
    const navContainer = document.querySelector('.converter-nav');
    const contentContainer = document.querySelector('.converter-content');

    navContainer.innerHTML = '';
    contentContainer.innerHTML = '';

    Object.keys(converterData).forEach((key, index) => {
        const data = converterData[key];

        const navBtn = document.createElement('button');
        navBtn.className = 'converter-nav-btn';
        navBtn.dataset.converter = key;
        navBtn.innerHTML = `<i class="fas ${data.icon}"></i> ${data.name}`;
        navBtn.onclick = () => showConverter(key);
        navContainer.appendChild(navBtn);

        const section = document.createElement('div');
        section.id = `${key}-converter`;
        section.className = 'converter-section';

        if (data.type === 'special') {
            section.innerHTML = createTemperatureConverterHTML(key, data);
        } else if (data.type === 'interest') {
            section.innerHTML = createInterestConverterHTML(key, data);
        } else {
            section.innerHTML = createStandardConverterHTML(key, data);
        }
        contentContainer.appendChild(section);

        if (index === 0) {
            navBtn.classList.add('active');
            section.classList.add('active');
        }
    });

    Object.keys(converterData).forEach(key => {
        const fromInput = document.getElementById(`${key}-input`);
        if (fromInput) fromInput.addEventListener('input', () => performConversion(key));

        const selects = document.querySelectorAll(`#${key}-from, #${key}-to`);
        selects.forEach(sel => sel.addEventListener('change', () => performConversion(key)));

        const interestInputs = document.querySelectorAll(`#interest-principal, #interest-rate, #interest-time`);
        interestInputs.forEach(inp => inp.addEventListener('input', performInterestCalculation));
    });
}

function showConverter(key) {
    document.querySelectorAll('.converter-nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-converter="${key}"]`).classList.add('active');

    document.querySelectorAll('.converter-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(`${key}-converter`).classList.add('active');
}

function createStandardConverterHTML(key, data) {
    const options = Object.keys(data.units).map(unit => `<option value="${unit}">${unit}</option>`).join('');
    return `
        <div class="converter-card">
            <h4><i class="fas ${data.icon}"></i> ${data.name} Converter</h4>
            <div class="converter-grid">
                <div class="input-group">
                    <label>From</label>
                    <select id="${key}-from" class="unit-select">${options}</select>
                    <input type="number" id="${key}-input" class="unit-input" placeholder="Enter value">
                </div>
                <div class="conversion-arrow"><i class="fas fa-arrow-right"></i></div>
                <div class="input-group">
                    <label>To</label>
                    <select id="${key}-to" class="unit-select">${options.replace('selected', '')}</select>
                    <div class="result-display" id="${key}-result">0</div>
                </div>
            </div>
        </div>`;
}

function createTemperatureConverterHTML(key, data) {
    const units = ['Celsius', 'Fahrenheit', 'Kelvin'];
    const options = units.map(u => `<option value="${u}">${u}</option>`).join('');
    return createStandardConverterHTML(key, { ...data, units: units.reduce((acc, u) => ({ ...acc, [u]: 1 }), {}) });
}

function createInterestConverterHTML(key, data) {
    return `
        <div class="converter-card">
            <h4><i class="fas ${data.icon}"></i> ${data.name} Calculator (Simple)</h4>
            <div class="input-group">
                <label for="interest-principal">Principal Amount</label>
                <input type="number" id="interest-principal" class="unit-input" placeholder="e.g. 10000">
            </div>
            <div class="input-group">
                <label for="interest-rate">Annual Interest Rate (%)</label>
                <input type="number" id="interest-rate" class="unit-input" placeholder="e.g. 5">
            </div>
            <div class="input-group">
                <label for="interest-time">Time Period (Years)</label>
                <input type="number" id="interest-time" class="unit-input" placeholder="e.g. 2">
            </div>
            <hr style="grid-column: 1 / -1; border: 1px solid var(--border-color); margin: 1rem 0;">
            <div class="input-group">
                <label>Total Interest</label>
                <div class="result-display" id="interest-total-interest">0</div>
            </div>
            <div class="input-group">
                <label>Total Amount (Principal + Interest)</label>
                <div class="result-display" id="interest-total-amount">0</div>
            </div>
        </div>`;
}

function performConversion(key) {
    const data = converterData[key];
    if (!data || data.type === 'interest') return;

    const fromUnit = document.getElementById(`${key}-from`).value;
    const toUnit = document.getElementById(`${key}-to`).value;
    const fromValue = parseFloat(document.getElementById(`${key}-input`).value) || 0;
    const resultDisplay = document.getElementById(`${key}-result`);

    try {
        let result;
        if (data.type === 'special') {
            let celsius;
            if (fromUnit === 'Fahrenheit') celsius = (fromValue - 32) * 5/9;
            else if (fromUnit === 'Kelvin') celsius = fromValue - 273.15;
            else celsius = fromValue;

            if (toUnit === 'Fahrenheit') result = (celsius * 9/5) + 32;
            else if (toUnit === 'Kelvin') result = celsius + 273.15;
            else result = celsius;
        } else {
            const baseValue = fromValue * data.units[fromUnit];
            result = baseValue / data.units[toUnit];
        }

        if (!isFinite(result)) throw new Error("Conversion result is not finite");
        resultDisplay.textContent = Number(result.toPrecision(9)).toString();
        resultDisplay.style.color = 'var(--text-primary)';
    } catch (error) {
        console.error('Conversion Error:', error);
        resultDisplay.textContent = 'Error';
        resultDisplay.style.color = 'red';
    }
}

function performInterestCalculation() {
    const principal = parseFloat(document.getElementById('interest-principal').value) || 0;
    const rate = parseFloat(document.getElementById('interest-rate').value) || 0;
    const time = parseFloat(document.getElementById('interest-time').value) || 0;

    try {
        const totalInterest = (principal * rate * time) / 100;
        const totalAmount = principal + totalInterest;

        if (!isFinite(totalInterest) || !isFinite(totalAmount)) throw new Error("Interest calculation result is not finite");

        document.getElementById('interest-total-interest').textContent = totalInterest.toFixed(2);
        document.getElementById('interest-total-interest').style.color = 'var(--text-primary)';
        document.getElementById('interest-total-amount').textContent = totalAmount.toFixed(2);
        document.getElementById('interest-total-amount').style.color = 'var(--text-primary)';
    } catch (error) {
        console.error('Interest Calculation Error:', error);
        document.getElementById('interest-total-interest').textContent = 'Error';
        document.getElementById('interest-total-interest').style.color = 'red';
        document.getElementById('interest-total-amount').textContent = 'Error';
        document.getElementById('interest-total-amount').style.color = 'red';
    }
}

// ===== KEYBOARD INPUT HANDLING =====
function handleKeyboardInput(e) {
    if (currentTab === 'converter') return;

    const key = e.key;
    const activeDisplay = document.activeElement;

    if (activeDisplay.tagName === 'INPUT' && activeDisplay.type === 'text') return;
    if (activeDisplay.tagName === 'SELECT') return;

    e.preventDefault();

    if (key >= '0' && key <= '9' || key === '.') append(currentTab, key);
    if (['+', '-', '*', '/'].includes(key)) append(currentTab, key);
    if (key === 'Enter' || key === '=') calculate(currentTab);
    if (key === 'Backspace') backspace(currentTab);
    if (key.toLowerCase() === 'c' || key === 'Escape') clearDisplay(currentTab);
    if (key === 'p' && currentTab === 'scientific') append('scientific', 'PI');
}

// --- Web Speech API Voice Input ---
let recognition;
function startVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Web Speech API not supported in this browser.');
        return;
    }
    if (!recognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('scientific-display').value = transcript;
            document.getElementById('mic-btn').classList.remove('listening');
        };
        recognition.onerror = function() {
            document.getElementById('mic-btn').classList.remove('listening');
        };
        recognition.onend = function() {
            document.getElementById('mic-btn').classList.remove('listening');
        };
    }
    recognition.start();
    document.getElementById('mic-btn').classList.add('listening');
}

// --- Graphing Calculator ---
let graphChart;
function plotGraph() {
    const expr = document.getElementById('graphing-display').value;
    let match = expr.match(/y\s*=\s*(.+)/i) || expr.match(/f\s*\(\s*x\s*\)\s*=\s*(.+)/i);
    if (!match) {
        alert('Please enter equation in the form y=...');
        return;
    }
    let fnBody = match[1];
    // Fix implicit multiplication: 2x -> 2*x, x2 -> x*2
    fnBody = fnBody.replace(/(\d)(x)/gi, '$1*$2').replace(/(x)(\d)/gi, '$1*$2');
    fnBody = fnBody.replace(/\^/g, '**');
    let fn;
    try {
        fn = new Function('x', 'return ' + fnBody + ';');
    } catch (e) {
        alert('Invalid equation');
        return;
    }
    const xVals = [];
    const yVals = [];
    for (let x = -10; x <= 10; x += 0.1) {
        xVals.push(Number(x.toFixed(2)));
        try {
            let y = fn(x);
            if (typeof y !== 'number' || isNaN(y) || !isFinite(y)) yVals.push(null);
            else yVals.push(Number(y));
        } catch {
            yVals.push(null);
        }
    }
    if (graphChart) graphChart.destroy();
    const ctx = document.getElementById('graph-canvas').getContext('2d');
    graphChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: xVals,
            datasets: [{
                label: expr,
                data: yVals,
                borderColor: '#4facfe',
                backgroundColor: 'rgba(71,172,254,0.1)',
                pointRadius: 0,
                borderWidth: 2,
                fill: false,
            }]
        },
        options: {
            responsive: false,
            scales: {
                x: { title: { display: true, text: 'x' } },
                y: { title: { display: true, text: 'y' } }
            }
        }
    });
}

// --- Programmer Calculator ---
// Add to the global state variables
let programmerValue = 0; // Current value for programmer calculator
let programmerBase = 'decimal'; // Current base for programmer calculator
let operationPending = null; // Tracks the pending bitwise operation
let firstOperand = null; // Stores first operand for two-operand operations

// Update the display based on the selected base
function updateProgrammerDisplay() {
  const display = document.getElementById('programmer-display');
  const baseSelect = document.getElementById('programmer-base');
  programmerBase = baseSelect.value;

  let displayValue = programmerValue;
  switch (programmerBase) {
    case 'binary':
      displayValue = programmerValue.toString(2);
      break;
    case 'octal':
      displayValue = programmerValue.toString(8);
      break;
    case 'hexadecimal':
      displayValue = programmerValue.toString(16).toUpperCase();
      break;
    case 'decimal':
    default:
      displayValue = programmerValue.toString(10);
  }

  display.value = displayValue;
  updateProgrammerResults(programmerValue);
}

function updateProgrammerResults(value) {
  document.getElementById('bin-result').textContent = value.toString(2);
  document.getElementById('oct-result').textContent = value.toString(8);
  document.getElementById('dec-result').textContent = value.toString(10);
  document.getElementById('hex-result').textContent = value.toString(16).toUpperCase();
}

function append(calculatorType, value) {
  const display = document.getElementById(`${calculatorType}-display`);
  if (calculatorType === 'programmer') {
    // Validate input based on base
    const validChars = {
      decimal: /[0-9]/,
      binary: /[0-1]/,
      octal: /[0-7]/,
      hexadecimal: /[0-9A-Fa-f]/
    };
    if (!validChars[programmerBase].test(value)) return;

    if (display.value === '0' || display.value === 'Error') {
      display.value = value;
    } else {
      display.value += value;
    }

    // Convert current display value to decimal for internal storage
    programmerValue = parseInt(display.value, programmerBase === 'binary' ? 2 : programmerBase === 'octal' ? 8 : programmerBase === 'hexadecimal' ? 16 : 10);
    updateProgrammerResults(programmerValue);
  } else {
    if (display.value === '0' || display.value === 'Error') {
      display.value = '';
    }
    display.value += value;
  }
  addButtonFeedback(event.target);
}

function clearDisplay(calculatorType) {
  const display = document.getElementById(`${calculatorType}-display`);
  display.value = '0';
  if (calculatorType === 'programmer') {
    programmerValue = 0;
    operationPending = null;
    firstOperand = null;
    updateProgrammerResults(0);
  }
  document.getElementById(`${calculatorType}-preview`).textContent = '';
  addButtonFeedback(event.target);
}

function bitwiseOperation(op) {
  const display = document.getElementById('programmer-display');
  if (op === 'NOT') {
    programmerValue = ~programmerValue;
    updateProgrammerDisplay();
    addToHistory(`NOT ${display.value}`, programmerValue.toString(), 'programmer');
  } else {
    if (firstOperand === null) {
      firstOperand = programmerValue;
      operationPending = op;
      display.value = '0';
      programmerValue = 0;
      document.getElementById('programmer-preview').textContent = `${firstOperand} ${op}`;
    } else {
      let result;
      switch (operationPending) {
        case 'AND':
          result = firstOperand & programmerValue;
          break;
        case 'OR':
          result = firstOperand | programmerValue;
          break;
        case 'XOR':
          result = firstOperand ^ programmerValue;
          break;
        case '<<':
          result = firstOperand << programmerValue;
          break;
        case '>>':
          result = firstOperand >> programmerValue;
          break;
      }
      programmerValue = result;
      updateProgrammerDisplay();
      addToHistory(`${firstOperand} ${operationPending} ${programmerValue}`, result.toString(), 'programmer');
      firstOperand = null;
      operationPending = null;
      document.getElementById('programmer-preview').textContent = '';
    }
  }
  addButtonFeedback(event.target);
}

/// --- Currency Converter (Live API) ---
let currencyRates = {};
async function fetchCurrencies() {
    const apiKey = '71278f05fc4be7159cf51298';
    try {
        const res = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
        const data = await res.json();
        if (data.result !== 'success' && !data.conversion_rates) throw new Error('API error');
        currencyRates = data.conversion_rates || data.rates || {};
        const fromSel = document.getElementById('currency-from');
        const toSel = document.getElementById('currency-to');
        fromSel.innerHTML = '';
        toSel.innerHTML = '';
        Object.keys(currencyRates).forEach(code => {
            fromSel.innerHTML += `<option value="${code}">${code}</option>`;
            toSel.innerHTML += `<option value="${code}">${code}</option>`;
        });
        fromSel.value = 'USD';
        toSel.value = 'EUR';
        document.getElementById('currency-amount').removeAttribute('readonly');
        document.getElementById('currency-amount').disabled = false;
    } catch (e) {
        document.getElementById('currency-result').textContent = 'Failed to load rates.';
        document.getElementById('currency-amount').setAttribute('readonly', 'readonly');
        document.getElementById('currency-amount').disabled = true;
    }
}
function performCurrencyConversion() {
    const amountInput = document.getElementById('currency-amount');
    amountInput.removeAttribute('readonly');
    amountInput.disabled = false;
    const amount = parseFloat(amountInput.value);
    const from = document.getElementById('currency-from').value;
    const to = document.getElementById('currency-to').value;
    const resultDisplay = document.getElementById('currency-result');
    if (!currencyRates[from] || !currencyRates[to]) {
        resultDisplay.textContent = 'Rates not loaded';
        return;
    }
    if (isNaN(amount) || amount < 0) {
        resultDisplay.textContent = 'Enter a valid amount';
        return;
    }
    const result = amount * (currencyRates[to] / currencyRates[from]);
    resultDisplay.textContent = `${amount} ${from} = ${result.toFixed(4)} ${to}`;
}
document.addEventListener('DOMContentLoaded', fetchCurrencies);

function addButtonFeedback(button) {
    if (!button) return;
    button.classList.add('active');
    setTimeout(() => button.classList.remove('active'), 150);
}

function addToHistory(expression, result, type) {
    const entry = {
        expression,
        result,
        type,
        timestamp: new Date().toISOString()
    };
    let calculationHistory = JSON.parse(localStorage.getItem('pro-calc-history')) || [];
    calculationHistory.unshift(entry);
    if (calculationHistory.length > 200) calculationHistory.pop();
    localStorage.setItem('pro-calc-history', JSON.stringify(calculationHistory));
}

// Initialize currency converter
async function initializeCurrencyConverter() {
    await fetchExchangeRates();
    setupCurrencyEventListeners();
}

function setupCurrencyEventListeners() {
    const currencyInputs = document.querySelectorAll('#currency-input, #currency-from, #currency-to');
    currencyInputs.forEach(input => input.addEventListener('change', performCurrencyConversion));
    document.querySelector('.action-btn[onclick="performCurrencyConversion()"]')?.addEventListener('click', performCurrencyConversion);
}

// Export functions for external use (if needed)
window.fetchExchangeRates = fetchExchangeRates;
window.performCurrencyConversion = performCurrencyConversion;
window.initializeCurrencyConverter = initializeCurrencyConverter;
// --- Tab switching for new tabs ---
document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        document.getElementById(`${this.dataset.tab}-tab`).classList.add('active');
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
    });
});
function handleKeyboardInput(e) {
    // Define tabs that have calculator displays
    const calculatorTabs = ['simple', 'scientific', 'graphing', 'programmer'];
    // Return early if the current tab is not a calculator tab
    if (!calculatorTabs.includes(currentTab)) return;

    const key = e.key;
    const activeDisplay = document.activeElement;

    // Ignore if user is typing in an input or select element
    if (activeDisplay.tagName === 'INPUT' && activeDisplay.type === 'text') return;
    if (activeDisplay.tagName === 'INPUT' && activeDisplay.type === 'number') return;
    if (activeDisplay.tagName === 'SELECT') return;

    e.preventDefault();

    if (key >= '0' && key <= '9' || key === '.') append(currentTab, key);
    if (['+', '-', '*', '/'].includes(key)) append(currentTab, key);
    if (key === 'Enter' || key === '=') calculate(currentTab);
    if (key === 'Backspace') backspace(currentTab);
    if (key.toLowerCase() === 'c' || key === 'Escape') clearDisplay(currentTab);
    if (key === 'p' && currentTab === 'scientific') append('scientific', 'PI');
}