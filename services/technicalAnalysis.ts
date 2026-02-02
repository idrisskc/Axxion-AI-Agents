import { CandleData } from '../types';

const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

export const calculateSMA = (data: CandleData[], period: number, key: keyof CandleData = 'close'): number[] => {
  const results: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push(null as any); 
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    results.push(avg(slice.map(d => d[key] as number)));
  }
  return results;
};

export const calculateWMA = (data: CandleData[], period: number): number[] => {
  const results: number[] = [];
  const denominator = (period * (period + 1)) / 2;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push(null as any);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += (data[i - (period - 1) + j].close * (j + 1));
    }
    results.push(sum / denominator);
  }
  return results;
};

export const calculateEMA = (data: CandleData[], period: number): number[] => {
  const results: number[] = [];
  const k = 2 / (period + 1);
  let prevEMA: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push(null as any);
      continue;
    }
    if (prevEMA === null) {
      const sma = avg(data.slice(0, period).map(d => d.close));
      results.push(sma);
      prevEMA = sma;
    } else {
      const currentEMA = (data[i].close - prevEMA) * k + prevEMA;
      results.push(currentEMA);
      prevEMA = currentEMA;
    }
  }
  return results;
};

export const calculateVWAP = (data: CandleData[]): number[] => {
  let cumulativePV = 0;
  let cumulativeV = 0;
  return data.map(d => {
    const typicalPrice = (d.high + d.low + d.close) / 3;
    cumulativePV += typicalPrice * d.volume;
    cumulativeV += d.volume;
    return cumulativePV / (cumulativeV || 1);
  });
};

export const calculateATR = (data: CandleData[], period: number): number[] => {
  const tr: number[] = [data[0].high - data[0].low];
  for (let i = 1; i < data.length; i++) {
    tr.push(Math.max(
      data[i].high - data[i].low,
      Math.abs(data[i].high - data[i - 1].close),
      Math.abs(data[i].low - data[i - 1].close)
    ));
  }
  const atr: number[] = Array(period - 1).fill(null);
  let firstATR = avg(tr.slice(0, period));
  atr.push(firstATR);
  let prevATR = firstATR;
  for (let i = period; i < data.length; i++) {
    const currentATR = (prevATR * (period - 1) + tr[i]) / period;
    atr.push(currentATR);
    prevATR = currentATR;
  }
  return atr;
};

export const calculateMFI = (data: CandleData[], period: number): number[] => {
  const results: number[] = Array(period).fill(null);
  const typicalPrices = data.map(d => (d.high + d.low + d.close) / 3);
  for (let i = period; i < data.length; i++) {
    let posFlow = 0;
    let negFlow = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const rawFlow = typicalPrices[j] * data[j].volume;
      if (typicalPrices[j] > typicalPrices[j - 1]) posFlow += rawFlow;
      else if (typicalPrices[j] < typicalPrices[j - 1]) negFlow += rawFlow;
    }
    const moneyRatio = posFlow / (negFlow || 1);
    results.push(100 - (100 / (1 + moneyRatio)));
  }
  return results;
};

export const calculateADX = (data: CandleData[], period: number) => {
  const tr: number[] = [0];
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  for (let i = 1; i < data.length; i++) {
    const highDiff = data[i].high - data[i - 1].high;
    const lowDiff = data[i - 1].low - data[i].low;
    tr.push(Math.max(data[i].high - data[i].low, Math.abs(data[i].high - data[i - 1].close), Math.abs(data[i].low - data[i - 1].close)));
    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
  }
  const smoothTR = calculateEMA_Array(tr, period);
  const smoothPlusDM = calculateEMA_Array(plusDM, period);
  const smoothMinusDM = calculateEMA_Array(minusDM, period);
  const plusDI = smoothPlusDM.map((v, i) => 100 * v / (smoothTR[i] || 1));
  const minusDI = smoothMinusDM.map((v, i) => 100 * v / (smoothTR[i] || 1));
  const dx = plusDI.map((v, i) => 100 * Math.abs(v - minusDI[i]) / (v + minusDI[i] || 1));
  const adx = calculateEMA_Array(dx, period);
  return { adx, plusDI, minusDI };
};

export const calculateSuperTrend = (data: CandleData[], period: number, multiplier: number) => {
  const atr = calculateATR(data, period);
  const results: { trend: number[], upper: number[], lower: number[] } = {
    trend: Array(data.length).fill(null),
    upper: Array(data.length).fill(null),
    lower: Array(data.length).fill(null)
  };
  let currentTrend = 1;
  for (let i = period; i < data.length; i++) {
    if (atr[i] === null) continue;
    const hl2 = (data[i].high + data[i].low) / 2;
    let basicUpper = hl2 + multiplier * atr[i];
    let basicLower = hl2 - multiplier * atr[i];
    results.upper[i] = (i > 0 && basicUpper < results.upper[i-1] || (data[i-1] && data[i-1].close > results.upper[i-1])) ? basicUpper : (results.upper[i-1] || basicUpper);
    results.lower[i] = (i > 0 && basicLower > results.lower[i-1] || (data[i-1] && data[i-1].close < results.lower[i-1])) ? basicLower : (results.lower[i-1] || basicLower);
    if (data[i].close > results.upper[i]) currentTrend = 1;
    else if (data[i].close < results.lower[i]) currentTrend = -1;
    results.trend[i] = currentTrend === 1 ? results.lower[i] : results.upper[i];
  }
  return results;
};

export const calculateIchimoku = (data: CandleData[]) => {
  const getHighLowAvg = (slice: CandleData[]) => {
    if (slice.length === 0) return null;
    const high = Math.max(...slice.map(d => d.high));
    const low = Math.min(...slice.map(d => d.low));
    return (high + low) / 2;
  };
  return data.map((_, i) => {
    const conversion = i >= 8 ? getHighLowAvg(data.slice(i - 8, i + 1)) : null;
    const base = i >= 25 ? getHighLowAvg(data.slice(i - 25, i + 1)) : null;
    const spanA = (conversion !== null && base !== null) ? (conversion + base) / 2 : null;
    const spanB = i >= 51 ? getHighLowAvg(data.slice(i - 51, i + 1)) : null;
    const lagging = (i + 26 < data.length) ? data[i + 26].close : null;
    return { conversion, base, spanA, spanB, lagging };
  });
};

export const calculateKeltner = (data: CandleData[], period: number, multiplier: number) => {
  const ema = calculateEMA(data, period);
  const atr = calculateATR(data, period);
  return {
    upper: ema.map((v, i) => (v !== null && atr[i] !== null) ? v + (multiplier * atr[i]) : null),
    middle: ema,
    lower: ema.map((v, i) => (v !== null && atr[i] !== null) ? v - (multiplier * atr[i]) : null)
  };
};

export const calculateOBV = (data: CandleData[]) => {
  const obv = [0];
  for (let i = 1; i < data.length; i++) {
    let currentOBV = obv[i - 1];
    if (data[i].close > data[i - 1].close) currentOBV += data[i].volume;
    else if (data[i].close < data[i - 1].close) currentOBV -= data[i].volume;
    obv.push(currentOBV);
  }
  return obv;
};

function calculateEMA_Array(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const results: number[] = Array(values.length).fill(0);
  results[0] = values[0];
  for (let i = 1; i < values.length; i++) {
    results[i] = (values[i] - results[i - 1]) * k + results[i - 1];
  }
  return results;
}

export const calculateBollingerBands = (data: CandleData[], period: number, stdDev: number) => {
  const sma = calculateSMA(data, period, 'close');
  const upper: number[] = [];
  const lower: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || sma[i] === null) { upper.push(null as any); lower.push(null as any); continue; }
    const slice = data.slice(i - period + 1, i + 1).map(d => d.close);
    const mean = sma[i];
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);
    upper.push(mean + (sd * stdDev));
    lower.push(mean - (sd * stdDev));
  }
  return { upper, middle: sma, lower };
};

export const calculateRSI = (data: CandleData[], period: number): number[] => {
  const results: number[] = Array(data.length).fill(null);
  if (data.length < period + 1) return results;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = data[i].close - data[i - 1].close;
    if (d >= 0) gains += d; else losses += Math.abs(d);
  }
  let avgG = gains / period, avgL = losses / period;
  results[period] = 100 - (100 / (1 + (avgG / (avgL || 1))));
  for (let i = period + 1; i < data.length; i++) {
    const d = data[i].close - data[i - 1].close;
    avgG = (avgG * (period - 1) + (d > 0 ? d : 0)) / period;
    avgL = (avgL * (period - 1) + (d < 0 ? Math.abs(d) : 0)) / period;
    results[i] = 100 - (100 / (1 + (avgG / (avgL || 1))));
  }
  return results;
};

export const calculateMACD = (data: CandleData[], fast = 12, slow = 26, signal = 9) => {
  const f = calculateEMA(data, fast), s = calculateEMA(data, slow);
  const macd = data.map((_, i) => (f[i] !== null && s[i] !== null) ? f[i] - s[i] : null as any);
  const sig = calculateEMA_Array(macd.map(v => v === null ? 0 : v), signal);
  return { macd, signal: sig, histogram: macd.map((v, i) => (v !== null) ? v - sig[i] : null as any) };
};

export const calculateStochastic = (data: CandleData[], kP = 14, dP = 3) => {
  const kArr = data.map((_, i) => {
    if (i < kP - 1) return null;
    const slice = data.slice(i - kP + 1, i + 1);
    const low = Math.min(...slice.map(d => d.low)), high = Math.max(...slice.map(d => d.high));
    return ((data[i].close - low) / (high - low || 1)) * 100;
  });
  const dArr = kArr.map((_, i) => {
    if (i < kP + dP - 2 || kArr[i] === null) return null;
    const slice = kArr.slice(i - dP + 1, i + 1) as number[];
    return avg(slice);
  });
  return { k: kArr, d: dArr };
};