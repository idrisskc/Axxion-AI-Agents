
import { CandleData, Indicator, SymbolInfo } from '../types';
import { calculateRSI, calculateEMA } from './technicalAnalysis';

export interface TradeLog {
  id: string;
  timestamp: number;
  type: 'INFO' | 'BUY' | 'SELL' | 'ERROR';
  origin: 'MANUAL' | 'AI';
  message: string;
  ticker?: string;
  targetPrice?: number;
  status?: 'PENDING' | 'EXECUTED';
}

export interface BotDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
  strength: number;
}

export const evaluateStrategy = (
  data: CandleData[],
  indicators: Indicator[]
): BotDecision => {
  if (data.length < 30) return { action: 'HOLD', reason: 'Insufficient data', strength: 0 };

  const lastPrice = data[data.length - 1].close;
  const rsi = calculateRSI(data, 14);
  const ema9 = calculateEMA(data, 9);
  const ema21 = calculateEMA(data, 21);

  const currentRsi = rsi[rsi.length - 1];
  const lastEma9 = ema9[ema9.length - 1];
  const lastEma21 = ema21[ema21.length - 1];
  const prevEma9 = ema9[ema9.length - 2];
  const prevEma21 = ema21[ema21.length - 2];

  // Simple EMA Crossover + RSI strategy
  const isBullishCross = prevEma9 <= prevEma21 && lastEma9 > lastEma21;
  const isBearishCross = prevEma9 >= prevEma21 && lastEma9 < lastEma21;

  if (isBullishCross && currentRsi < 70) {
    return {
      action: 'BUY',
      reason: `EMA Golden Cross detected. RSI at ${currentRsi?.toFixed(2)}`,
      strength: 85 + Math.random() * 10
    };
  }

  if (isBearishCross && currentRsi > 30) {
    return {
      action: 'SELL',
      reason: `EMA Death Cross detected. RSI at ${currentRsi?.toFixed(2)}`,
      strength: 80 + Math.random() * 10
    };
  }

  // Oversold/Overbought mean reversion
  if (currentRsi < 30) {
    return {
      action: 'BUY',
      reason: `Oversold RSI: ${currentRsi?.toFixed(2)}`,
      strength: 70 + (30 - currentRsi)
    };
  }

  if (currentRsi > 70) {
    return {
      action: 'SELL',
      reason: `Overbought RSI: ${currentRsi?.toFixed(2)}`,
      strength: 70 + (currentRsi - 70)
    };
  }

  return { action: 'HOLD', reason: 'Market neutral', strength: 0 };
};
