# 🎨 TradingView Style Layout

Обновленный интерфейс в стиле TradingView терминала.

---

## 📊 Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                          HEADER (50px)                              │
│  [Ticker] [Timeframes]                          [Theme] [Trade]     │
├──────┬──────────────────────────────┬───────────────────────────────┤
│      │                              │                               │
│ LEFT │         CHART AREA           │        RIGHT SIDEBAR          │
│TOOLS │                              │                               │
│      │   ┌──────────────────────┐   │  [Order] [Watchlist] [ML]    │
│ ✏️   │   │   Main Chart         │   │                               │
│ ╱    │   │                      │   │  ┌───────────────────────┐   │
│ ~    │   │                      │   │  │ Quick Order Panel     │   │
│ T    │   │                      │   │  └───────────────────────┘   │
│ 🖌   │   └──────────────────────┘   │  ┌───────────────────────┐   │
│      │   ┌──────────────────────┐   │  │ Position Manager      │   │
│ 📰   │   │   Indicator (RSI)    │   │  └───────────────────────┘   │
│ ⚙️   │   └──────────────────────┘   │                               │
│      │                              │                               │
├──────┴──────────────────────────────┴───────────────────────────────┤
│                      NEWS TICKER (Compact)                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Features

### 1. Header (50px)

```tsx
├─ Ticker Info (BTCUSDT.P, price, change)
├─ Timeframes (1м, 5м, 15м, 1ч, 4ч, 1Д, 1Н)
└─ Actions (Theme toggle, Indicators, Trade button)
```

### 2. Left Sidebar (50px)

```tsx
├─ Drawing Tools (✏️ ╱ ~ T 🖌)
└─ Bottom Actions (📰 News, ⚙️ Settings)
```

### 3. Chart Area (Flexible)

```tsx
├─ Main Chart (Lightweight Charts)
└─ Indicator Panel (150px height)
```

### 4. Right Sidebar (300px)

```tsx
├─ Tabs: [Order] [Watchlist] [ML]
└─ Content (switchable)
```

### 5. Bottom News Ticker

```tsx
└─ Compact news scroll (auto-refresh 60s)
```

---

## 🎨 Themes

### Light Theme (Default)

```css
--bg-color: #ffffff
--border-color: #e0e3eb
--text-color: #131722
--text-secondary: #787b86
--hover-bg: #f0f3fa
```

### Dark Theme

```css
--bg-color: #131722
--border-color: #242832
--text-color: #d1d4dc
--text-secondary: #787b86
--hover-bg: #2a2e39
```

---

## 🔧 Usage

### Switch Theme

```tsx
const [theme, setTheme] = useState<'light' | 'dark'>('light');

<button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
  {theme === 'light' ? '🌙' : '☀️'}
</button>
```

### Switch Right Panel

```tsx
const [rightPanel, setRightPanel] = useState<'order' | 'watchlist' | 'ml'>('order');

{/* Tabs */}
<button onClick={() => setRightPanel('order')}>Ордер</button>
<button onClick={() => setRightPanel('watchlist')}>Watchlist</button>
<button onClick={() => setRightPanel('ml')}>ML</button>

{/* Content */}
{rightPanel === 'order' && <QuickOrderPanel />}
{rightPanel === 'watchlist' && <Watchlist />}
{rightPanel === 'ml' && <MLDashboard />}
```

---

## 📁 Updated Files

| File | Changes |
|------|---------|
| `apps/web/src/app/page.tsx` | ⭐ Complete rewrite (TradingView style) |
| `apps/web/src/components/news/NewsTicker.tsx` | Compact mode |
| `apps/web/src/components/trading/QuickOrderPanel.tsx` | Integrated |
| `apps/web/src/components/ml/MLDashboard.tsx` | Integrated |

---

## 🎯 Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Layout** | Basic grid | TradingView exact copy |
| **Theme** | Dark only | Light + Dark toggle |
| **Header** | Simple | Full ticker + timeframes |
| **Left Panel** | Tools only | Tools + News toggle |
| **Right Panel** | Order only | Order/Watchlist/ML tabs |
| **News** | Full panel | Compact ticker (bottom) |
| **Indicator** | None | Bottom panel (150px) |

---

## 🚀 Quick Start

```bash
cd apps/web
pnpm dev

# Open http://localhost:3000
```

---

## 📊 Watchlist Data

```tsx
const watchlist = [
  { symbol: 'BTCUSDT.P', price: 63183.7, change: -2.23, icon: '#f0b90b' },
  { symbol: 'ETHUSDT.P', price: 1824.91, change: -1.65, icon: '#627eea' },
  { symbol: 'SOLUSDT.P', price: 76.61, change: -1.26, icon: '#000' },
  { symbol: 'BNBUSDT', price: 588.60, change: -1.29, icon: '#f0b90b' },
  { symbol: 'XRPUSDT', price: 1.3318, change: -1.51, icon: '#26a17b' },
  { symbol: 'DOGEUSDT', price: 0.0911, change: -1.51, icon: '#c3a634' },
  { symbol: 'ADAUSDT', price: 0.5420, change: 1.20, icon: '#ef5350' },
];
```

---

## ✅ Checklist

- [x] TradingView style layout
- [x] Light/Dark theme toggle
- [x] Header with ticker & timeframes
- [x] Left sidebar (drawing tools)
- [x] Chart area (main + indicator)
- [x] Right sidebar (3 tabs)
- [x] Bottom news ticker
- [x] Watchlist with 7 symbols
- [x] Quick order panel
- [x] Position manager
- [x] ML dashboard integration

---

**Ready to trade!** 🚀
