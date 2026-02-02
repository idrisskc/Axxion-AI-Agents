
import { SymbolInfo, CandleData } from '../types';

export const POPULAR_STOCKS: SymbolInfo[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', type: 'stock', price: 185.92, change: 1.2, changePercent: 0.65, volume: 52000000 },
  { ticker: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', type: 'stock', price: 172.10, change: -4.5, changePercent: -2.55, volume: 98000000 },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', type: 'stock', price: 875.20, change: 12.4, changePercent: 1.45, volume: 45000000 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', exchange: 'NASDAQ', type: 'stock', price: 415.10, change: 2.3, changePercent: 0.55, volume: 22000000 },
];

export const TOP_ETFS: SymbolInfo[] = [
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE', type: 'etf', price: 512.40, change: 1.1, changePercent: 0.22, volume: 65000000 },
  { ticker: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', type: 'etf', price: 435.60, change: 2.4, changePercent: 0.55, volume: 42000000 },
];

export const MAJOR_FOREX: SymbolInfo[] = [
  { ticker: 'EURUSD', name: 'Euro / US Dollar', exchange: 'FX', type: 'forex', price: 1.0854, change: 0.0012, changePercent: 0.11, volume: 0 },
  { ticker: 'GBPUSD', name: 'British Pound / US Dollar', exchange: 'FX', type: 'forex', price: 1.2742, change: -0.0005, changePercent: -0.04, volume: 0 },
];

/**
 * Generates realistic-looking mock data based on a starting price.
 * @param count Number of candles
 * @param basePrice The starting price (defaults to 60000 if not provided)
 */
export const generateMockCandles = (count: number = 100, basePrice?: number): CandleData[] => {
  let prevClose = basePrice || (60000 + Math.random() * 5000);
  const data: CandleData[] = [];
  const now = Date.now();
  const step = 60000; // 1m

  // Calculate volatility based on price level
  const volatility = prevClose * 0.001; 

  for (let i = count; i >= 0; i--) {
    const open = prevClose + (Math.random() - 0.5) * volatility;
    const close = open + (Math.random() - 0.5) * (volatility * 1.2);
    const high = Math.max(open, close) + Math.random() * (volatility * 0.5);
    const low = Math.min(open, close) - Math.random() * (volatility * 0.5);
    const volume = Math.random() * 1000 + 200;
    
    data.push({
      time: now - (i * step),
      open,
      high,
      low,
      close,
      volume
    });
    prevClose = close;
  }
  return data;
};
