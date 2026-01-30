# 換算機 | Currency Converter

A real-time currency converter with a Japanese receipt-inspired design.

![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge)
![Currencies](https://img.shields.io/badge/currencies-5-red?style=for-the-badge)

**[Live Demo](https://cosmovisioner.github.io/Converter/)**

## Features

- **Real-time exchange rates** — fetched from ExchangeRate API
- **Instant conversion** — type in any field, others update automatically
- **5 currencies** — RUB, USD, KZT, JPY + Kinder Bueno (1 = 100 RUB)
- **"Random!" button** — generates random amounts for fun
- **Auto-refresh** — rates update every 5 minutes
- **Offline mode** — uses cached rates when offline
- **Responsive design** — works on mobile and desktop

## Design

- Japanese receipt/check style
- Red grid background
- Cream paper card
- Chopsticks decoration
- Bold typography

## Project Structure

```
/Converter
├── index.html          # Main HTML page
├── css/
│   └── style.css       # Styles and animations
├── js/
│   └── script.js       # App logic and API calls
├── assets/             # Images and icons (future)
├── README.md           # Documentation
├── LICENSE             # MIT License
└── .gitignore          # Git ignore rules
```

## Tech Stack

- HTML5
- CSS3 (Grid, Flexbox, Custom Properties)
- Vanilla JavaScript (ES6+)
- [ExchangeRate API](https://open.er-api.com/) for live rates

## Usage

1. Open [live demo](https://cosmovisioner.github.io/Converter/)
2. Enter an amount in any currency field
3. Watch other currencies convert automatically
4. Click "Random!" for random amounts

## Local Development

```bash
# Clone the repository
git clone https://github.com/Cosmovisioner/Converter.git

# Open in browser
open index.html
```

## License

MIT
