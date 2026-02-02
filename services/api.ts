import { SymbolInfo, CandleData, Interval } from '../types';

const BINANCE_BASE = 'https://api.binance.com/api/v3';
const YAHOO_CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const YAHOO_SEARCH_BASE = 'https://query2.finance.yahoo.com/v1/finance/search';

let preferredProxyIndex = parseInt(localStorage.getItem('nexus_preferred_proxy') || '0');
const PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
  'https://thingproxy.freeboard.io/fetch/'
];

export const ASSETS = {
  STOCKS: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'NFLX', 'AMD', 'INTC'],
  FOREX: ['EURUSD=X', 'JPY=X', 'GBPUSD=X', 'AUDUSD=X', 'CAD=X', 'CHF=X'],
  ETFS: ['SPY', 'QQQ', 'VOO', 'XLK', 'GLD', 'VTI']
};

let binanceSymbolsCache: any[] | null = null;
let binanceCacheTime = 0;

const getPersistentCache = (key: string): { data: CandleData[], timestamp: number } | null => {
  try {
    const data = localStorage.getItem(`nexus_cache_${key}`);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

const setPersistentCache = (key: string, data: CandleData[]) => {
  try {
    if (!data || data.length === 0) return;
    const cacheObj = {
        data: data.slice(-500),
        timestamp: Date.now()
    };
    localStorage.setItem(`nexus_cache_${key}`, JSON.stringify(cacheObj)); 
  } catch {}
};

async function fetchWithRetry(url: string, useProxy: boolean = true) {
  let lastError: Error | null = null;
  const order = useProxy ? 
    [preferredProxyIndex, ...PROXIES.map((_, i) => i).filter(i => i !== preferredProxyIndex)] : 
    [-1];

  for (const idx of order) {
    const proxy = idx === -1 ? '' : PROXIES[idx];
    // Raccourci drastiquement le timeout pour la réactivité
    const timeoutMs = 2500; 

    try {
      const finalUrl = proxy ? `${proxy}${encodeURIComponent(url)}` : url;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      
      const resp = await fetch(finalUrl, { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(id);
      
      if (!resp.ok) {
        lastError = new Error(`HTTP ${resp.status}`);
        continue;
      }

      const text = await resp.text();
      const json = JSON.parse(text.trim());
      
      if (idx !== -1 && idx !== preferredProxyIndex) {
        preferredProxyIndex = idx;
        localStorage.setItem('nexus_preferred_proxy', idx.toString());
      }
      return json;
    } catch (e: any) {
      lastError = e;
      continue;
    }
  }
  throw lastError || new Error(`Failed to load: ${url}`);
}

export const fetchHistory = async (ticker: string, interval: Interval, type: string): Promise<{ data: CandleData[], isMock: boolean }> => {
  const cacheKey = `${ticker}_${interval}`;
  const isCrypto = type === 'crypto' || ticker.endsWith('USDT');
  const cached = getPersistentCache(cacheKey);
  
  const generateMock = (t: string, count: number = 100): CandleData[] => {
    let price = 50000;
    if (t.includes('BTC')) price = 95000;
    else if (t.includes('ETH')) price = 2500;
    else if (type === 'stock') price = 200;
    
    const data: CandleData[] = [];
    const now = Date.now();
    for(let i=0; i<count; i++) {
      const open = price + (Math.random()-0.5)*price*0.01;
      const close = open + (Math.random()-0.5)*price*0.01;
      data.push({
        time: now - (count-i)*60000,
        open, high: Math.max(open, close)*1.002, low: Math.min(open, close)*0.998,
        close, volume: Math.random()*1000
      });
      price = close;
    }
    return data;
  };

  if (cached) {
    return { data: cached.data, isMock: false };
  }

  try {
    let resultData: CandleData[] = [];
    if (isCrypto) {
      const bIntMap: Record<string, string> = { '1m': '1m', '5m': '5m', '15m': '15m', '1H': '1h', '4H': '4h', '1D': '1d', '1W': '1w', '1M': '1M' };
      const bInt = bIntMap[interval] || '1h';
      const targetUrl = `${BINANCE_BASE}/klines?symbol=${ticker}&interval=${bInt}&limit=300`;
      const data = await fetchWithRetry(targetUrl, false);
      resultData = data.map((d: any) => ({ 
        time: d[0], open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]), close: parseFloat(d[4]), volume: parseFloat(d[5]) 
      }));
    } else {
      const yParams = mapIntervalToYahoo(interval);
      const targetUrl = `${YAHOO_CHART_BASE}/${ticker}?interval=${yParams.interval}&range=${yParams.range}`;
      const data = await fetchWithRetry(targetUrl, true);
      const result = data.chart?.result?.[0];
      if (result && result.timestamp) {
         const timestamps = result.timestamp;
         const quotes = result.indicators.quote[0];
         const adjClose = result.indicators.adjclose?.[0]?.adjclose || quotes.close;
         resultData = timestamps.map((t: number, i: number) => ({
           time: t * 1000,
           open: quotes.open[i] ?? quotes.close[i],
           high: quotes.high[i] ?? quotes.close[i],
           low: quotes.low[i] ?? quotes.close[i],
           close: adjClose[i] ?? quotes.close[i],
           volume: quotes.volume[i] ?? 0
         })).filter((c: any) => c.close !== null && !isNaN(c.close));
      }
    }
    if (resultData.length > 0) {
      setPersistentCache(cacheKey, resultData);
      return { data: resultData, isMock: false };
    }
    return { data: generateMock(ticker), isMock: true };
  } catch (err) {
    return { data: generateMock(ticker), isMock: true };
  }
};

function mapIntervalToYahoo(interval: Interval): { interval: string, range: string } {
  switch (interval) {
    case '1m': return { interval: '1m', range: '1d' };
    case '5m': return { interval: '5m', range: '5d' };
    case '15m': return { interval: '15m', range: '5d' };
    case '1H': return { interval: '1h', range: '1mo' };
    case '4H': return { interval: '1h', range: '3mo' };
    case '1D': return { interval: '1d', range: '1y' };
    case '1W': return { interval: '1wk', range: '2y' };
    case '1M': return { interval: '1mo', range: '5y' };
    case '1Y': return { interval: '1mo', range: '10y' };
    default: return { interval: '1h', range: '1mo' };
  }
}

export const searchBinanceSymbols = async (query: string): Promise<SymbolInfo[]> => {
  if (!binanceSymbolsCache) {
    const saved = localStorage.getItem('binance_symbols_backup');
    if (saved) binanceSymbolsCache = JSON.parse(saved);
  }
  if (!binanceSymbolsCache || (Date.now() - binanceCacheTime > 600000)) {
    fetchWithRetry(`${BINANCE_BASE}/ticker/24hr`, false).then(res => {
      binanceSymbolsCache = res;
      binanceCacheTime = Date.now();
      localStorage.setItem('binance_symbols_backup', JSON.stringify(res));
    }).catch(() => {});
  }
  if (!binanceSymbolsCache) return [];
  const q = query.toUpperCase();
  return binanceSymbolsCache
    .filter((item: any) => item.symbol.endsWith('USDT') && (q ? item.symbol.includes(q) : true))
    .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
    .slice(0, 15)
    .map((item: any) => ({
      ticker: item.symbol,
      name: item.symbol.replace('USDT', ' / Tether'),
      exchange: 'BINANCE',
      type: 'crypto',
      price: parseFloat(item.lastPrice),
      change: parseFloat(item.priceChange),
      changePercent: parseFloat(item.priceChangePercent),
      volume: parseFloat(item.quoteVolume)
    }));
};

export const searchYahooSymbols = async (query: string): Promise<SymbolInfo[]> => {
  if (!query || query.length < 2) return [];
  try {
    const targetUrl = `${YAHOO_SEARCH_BASE}?q=${encodeURIComponent(query)}&newsCount=0`;
    const data = await fetchWithRetry(targetUrl, true);
    if (data.quotes) {
      return data.quotes.map((item: any) => ({
        ticker: item.symbol,
        name: item.shortname || item.longname || item.symbol,
        exchange: item.exchange || 'YAHOO',
        type: item.quoteType?.toLowerCase() === 'etf' ? 'etf' : (item.quoteType?.toLowerCase() === 'equity' ? 'stock' : 'forex'),
        price: 0,
        change: 0,
        changePercent: 0,
        volume: 0
      }));
    }
    return [];
  } catch (err) { return []; }
};

export const fetchSymbolQuote = async (symbol: SymbolInfo): Promise<Partial<SymbolInfo> | null> => {
  if (!symbol?.ticker) return null;
  const isCrypto = symbol.type === 'crypto' || symbol.ticker.endsWith('USDT');
  try {
    if (isCrypto) {
      const data = await fetchWithRetry(`${BINANCE_BASE}/ticker/price?symbol=${symbol.ticker}`, false);
      return { price: parseFloat(data.price) };
    } else {
      const data = await fetchWithRetry(`${YAHOO_CHART_BASE}/${symbol.ticker}?interval=1m&range=1d`, true);
      const meta = data.chart?.result?.[0]?.meta;
      if (meta) {
        const price = meta.regularMarketPrice;
        const prevClose = meta.previousClose || price;
        return {
          price: price,
          change: price - prevClose,
          changePercent: prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0,
          volume: meta.regularMarketVolume
        };
      }
    }
  } catch (err) { return null; }
  return null;
};