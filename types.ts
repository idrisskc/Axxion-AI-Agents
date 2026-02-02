
export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type IndicatorType = 
  | 'SMA' | 'EMA' | 'WMA' | 'BB' | 'RSI' | 'MACD' | 'STOCH' | 'VOL'
  | 'VWAP' | 'ATR' | 'ADX' | 'MFI' | 'SUPERTREND' | 'ICHIMOKU' | 'KELTNER' | 'OBV';

export interface Indicator {
  id: string;
  type: IndicatorType;
  period: number;
  visible?: boolean;
  color: string;
  lineWidth: number;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  stdDev?: number;
  multiplier?: number;
  upColor?: string;
  downColor?: string;
  showMa?: boolean;
  maColor?: string;
}

export type Interval = '1m' | '5m' | '15m' | '1H' | '4H' | '1D' | '1W' | '1M' | '1Y' | 'ALL';

export interface SymbolInfo {
  ticker: string;
  name: string;
  exchange: string;
  type: 'stock' | 'crypto' | 'forex' | 'etf';
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high24h?: number;
  low24h?: number;
  marketCap?: number;
  visible?: boolean;
}

export interface ChartSettings {
  theme: 'dark' | 'light';
  showGrid: boolean;
  timezone: string;
  chartType: 'candlestick' | 'area';
}

export interface TradeAlert {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  timestamp: string;
  strength: number;
}

// Multi-Agent Types
export type TradingCycleState = 'IDLE' | 'ANALYZING' | 'WAITING_ENTRY' | 'POSITION_OPEN' | 'MONITORING_EXIT' | 'COOLDOWN';

export interface InstitutionalDecision {
  symbol: string;
  timestamp: string;
  regime: { regime: 'TREND' | 'RANGE'; confidence: number };
  alpha: { trend_strength: number; volatility_state: 'CALM' | 'NORMAL' | 'STORM'; correlation_risk: number; alpha_score: number };
  sentiment: { sentiment_score: number; impact_level: 'LOW' | 'MEDIUM' | 'HIGH'; impact_horizon: 'SHORT' | 'MEDIUM' | 'LONG'; systemic_risk_flag: boolean };
  technical: { 
    signal: 'BUY' | 'SELL' | 'NONE'; 
    signal_strength: number; 
    trigger_price: number; 
    indicators_used: string[];
    convergence_explanation: string;
  };
  statistical: { z_score: number; volume_confirmation: boolean; statistical_confidence: number; validation: boolean };
  risk: { 
    position_size: number; 
    stop_loss: number; 
    take_profit: number; 
    trailing_stop_distance: number;
    is_storm_mode: boolean;
    var: number; 
    approval: boolean;
  };
  portfolio: { kelly_fraction: number; correlation_adjustment: number };
  execution: { 
    execution_plan: 'TWAP' | 'VWAP'; 
    order_type: 'MARKET' | 'LIMIT';
    routing_reason: string;
  };
  decision: { final_action: 'BUY' | 'SELL' | 'HOLD' | 'BLOCK'; authorized: boolean };
}
