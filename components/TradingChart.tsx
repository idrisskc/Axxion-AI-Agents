
import * as React from 'react';
import { CheckCircle2, Eye, EyeOff, X, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import ApexCharts from 'apexcharts';
import { CandleData, Indicator, SymbolInfo, Interval } from '../types';
import IndicatorPanel from './IndicatorPanel';
import { 
  calculateSMA, 
  calculateEMA, 
  calculateWMA,
  calculateBollingerBands, 
  calculateVWAP, 
  calculateSuperTrend,
  calculateIchimoku,
  calculateKeltner
} from '../services/technicalAnalysis';

interface TradingChartProps {
  data: CandleData[];
  indicators: Indicator[];
  symbol: SymbolInfo | undefined;
  interval: Interval;
  onIndicatorToggle: (id: string) => void;
  theme: 'dark' | 'light';
  comparedHistory?: Record<string, CandleData[]>;
  comparedSymbols?: SymbolInfo[];
  onRemoveCompared?: (ticker: string) => void;
  onToggleComparedVisibility?: (ticker: string) => void;
  lastOrder?: {side: 'BUY' | 'SELL', ticker: string, price: number} | null;
  chartType?: 'candlestick' | 'area';
}

const COMPARE_COLORS = ['#00E5FF', '#FF4081', '#E040FB', '#7C4DFF', '#FFA726', '#66BB6A'];

export const TradingChart: React.FC<TradingChartProps> = ({ 
  data = [], indicators = [], symbol, interval, onIndicatorToggle, theme, 
  comparedHistory = {}, comparedSymbols = [], onRemoveCompared, onToggleComparedVisibility,
  lastOrder,
  chartType = 'candlestick'
}) => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInstance = React.useRef<ApexCharts | null>(null);

  const mainIndicators = React.useMemo(() => 
    indicators.filter(i => ['SMA', 'EMA', 'WMA', 'BB', 'VWAP', 'SUPERTREND', 'ICHIMOKU', 'KELTNER'].includes(i.type)), 
  [indicators]);
  
  const subIndicators = React.useMemo(() => 
    indicators.filter(i => !['SMA', 'EMA', 'WMA', 'BB', 'VWAP', 'SUPERTREND', 'ICHIMOKU', 'KELTNER'].includes(i.type)), 
  [indicators]);

  const series = React.useMemo(() => {
    if (!data || !data.length) return [];
    
    const times = data.map(d => d.time);
    const main: any[] = [{
      name: symbol?.ticker || 'Price',
      type: chartType,
      data: chartType === 'candlestick' 
        ? data.map(d => ({ x: d.time, y: [d.open, d.high, d.low, d.close] }))
        : data.map(d => ({ x: d.time, y: d.close })),
      yaxisIndex: 0
    }];

    let axisCounter = 1;
    comparedSymbols?.forEach((s, idx) => {
      if (s.visible === false) return;
      const hist = comparedHistory[s.ticker];
      if (hist && hist.length > 0) {
        main.push({
          name: s.ticker,
          type: 'line',
          data: hist.map(d => ({ x: d.time, y: d.close })),
          color: COMPARE_COLORS[idx % COMPARE_COLORS.length],
          yaxisIndex: axisCounter++
        });
      }
    });

    mainIndicators.forEach(ind => {
      if (ind.visible === false) return;
      
      if (ind.type === 'SMA') {
        const d = calculateSMA(data, ind.period);
        main.push({ name: 'SMA', type: 'line', data: times.map((t, i) => ({ x: t, y: d[i] })), color: ind.color, yaxisIndex: 0 });
      } else if (ind.type === 'EMA') {
        const d = calculateEMA(data, ind.period);
        main.push({ name: 'EMA', type: 'line', data: times.map((t, i) => ({ x: t, y: d[i] })), color: ind.color, yaxisIndex: 0 });
      } else if (ind.type === 'WMA') {
        const d = calculateWMA(data, ind.period);
        main.push({ name: 'WMA', type: 'line', data: times.map((t, i) => ({ x: t, y: d[i] })), color: ind.color, yaxisIndex: 0 });
      } else if (ind.type === 'VWAP') {
        const d = calculateVWAP(data);
        main.push({ name: 'VWAP', type: 'line', data: times.map((t, i) => ({ x: t, y: d[i] })), color: ind.color || '#E040FB', yaxisIndex: 0 });
      } else if (ind.type === 'BB') {
        const d = calculateBollingerBands(data, ind.period, ind.stdDev || 2);
        main.push({ name: 'BB Upper', type: 'line', data: times.map((t, i) => ({ x: t, y: d.upper[i] })), color: ind.color, yaxisIndex: 0 });
        main.push({ name: 'BB Lower', type: 'line', data: times.map((t, i) => ({ x: t, y: d.lower[i] })), color: ind.color, yaxisIndex: 0 });
      } else if (ind.type === 'KELTNER') {
        const d = calculateKeltner(data, ind.period, ind.multiplier || 2);
        main.push({ name: 'KC Upper', type: 'line', data: times.map((t, i) => ({ x: t, y: d.upper[i] })), color: ind.color, yaxisIndex: 0 });
        main.push({ name: 'KC Lower', type: 'line', data: times.map((t, i) => ({ x: t, y: d.lower[i] })), color: ind.color, yaxisIndex: 0 });
      } else if (ind.type === 'SUPERTREND') {
        const d = calculateSuperTrend(data, ind.period, ind.multiplier || 3);
        main.push({ name: 'SuperTrend', type: 'line', data: times.map((t, i) => ({ x: t, y: d.trend[i] })), color: ind.color || '#00E5FF', yaxisIndex: 0 });
      } else if (ind.type === 'ICHIMOKU') {
        const d = calculateIchimoku(data);
        main.push({ name: 'Tenkan', type: 'line', data: times.map((t, i) => ({ x: t, y: d[i]?.conversion })), color: '#f23645', yaxisIndex: 0 });
        main.push({ name: 'Kijun', type: 'line', data: times.map((t, i) => ({ x: t, y: d[i]?.base })), color: '#00E5FF', yaxisIndex: 0 });
      }
    });

    return main;
  }, [data, mainIndicators, comparedHistory, symbol?.ticker, comparedSymbols, chartType]);

  React.useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const yAnnotations: any[] = [];
    
    // Principal price annotation
    if (symbol?.price) {
      yAnnotations.push({
        y: symbol.price,
        yAxisIndex: 0,
        borderColor: '#DFFF00',
        label: {
          style: { color: '#000', background: '#DFFF00', fontWeight: 900, fontSize: '10px' },
          text: symbol.price.toLocaleString(undefined, { minimumFractionDigits: symbol.type === 'forex' ? 4 : 2 }),
          position: 'right',
        }
      });
    }

    const yaxes: any[] = [{
      opposite: true,
      labels: {
        show: true,
        style: { colors: '#787b86', fontSize: '10px' },
        formatter: (val: number) => (val ?? 0).toLocaleString(undefined, { minimumFractionDigits: symbol?.type === 'forex' ? 4 : 2 })
      }
    }];

    // Add Y-axis labels (annotations) for compared symbols for perfect alignment
    let axisIdx = 1;
    comparedSymbols?.forEach((s, idx) => {
      const hist = comparedHistory[s.ticker];
      if (s.visible !== false && hist && hist.length > 0) {
        // Multi-axis setup (hidden axis for scaling, annotation for visual alignment)
        yaxes.push({ show: false, opposite: true, seriesName: s.ticker });
        
        const latestPrice = hist[hist.length - 1].close;
        const color = COMPARE_COLORS[idx % COMPARE_COLORS.length];
        
        yAnnotations.push({
          y: latestPrice,
          yAxisIndex: axisIdx,
          borderColor: color,
          label: {
            style: { color: '#fff', background: color, border: 'none', fontWeight: 900, fontSize: '9px' },
            text: latestPrice.toLocaleString(undefined, { minimumFractionDigits: s.type === 'forex' ? 4 : 2 }),
            position: 'right',
            offsetY: 0
          }
        });
        axisIdx++;
      }
    });

    const options: any = {
      chart: { 
        id: `main-chart-${symbol?.ticker || 'default'}`, 
        group: 'market-charts', 
        type: chartType,
        height: '100%',
        background: 'transparent', 
        toolbar: { show: false }, 
        animations: { enabled: false },
      },
      series: series,
      theme: { mode: theme },
      xaxis: { type: 'datetime', labels: { style: { colors: '#787b86', fontSize: '10px' } } },
      yaxis: yaxes,
      grid: { borderColor: 'rgba(255, 255, 255, 0.05)' },
      plotOptions: { candlestick: { colors: { upward: '#089981', downward: '#f23645' } } },
      stroke: { width: chartType === 'candlestick' ? 1 : 1.5, curve: 'straight' },
      legend: { show: false },
      tooltip: { theme: 'dark', shared: true },
      annotations: { yaxis: yAnnotations }
    };

    if (chartInstance.current) {
      chartInstance.current.updateOptions(options);
    } else {
      chartInstance.current = new ApexCharts(chartRef.current, options);
      chartInstance.current.render();
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [theme, symbol?.price, series, data.length, chartType, comparedSymbols, comparedHistory]);

  return (
    <div className="flex-1 flex flex-col gap-3 h-full overflow-hidden">
       <div className="flex-1 min-h-0 glass rounded-[32px] overflow-hidden relative border border-white/5 shadow-2xl">
          {/* Order Alert Overlay */}
          {lastOrder && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10 fade-in duration-500">
              <div className="bg-black/60 backdrop-blur-3xl border border-citron/20 rounded-2xl px-6 py-4 flex items-center gap-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-l-4 border-l-citron">
                <CheckCircle2 className="text-citron" size={24} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-citron tracking-widest">Order Secure</span>
                  <span className="text-sm font-black text-white">{lastOrder.side} {lastOrder.ticker} @ ${lastOrder.price.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Main Info Block */}
          <div className="absolute top-6 left-8 z-20 pointer-events-none flex flex-col gap-1 select-none">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-white uppercase tracking-tighter drop-shadow-lg">{symbol?.ticker || '---'}</span>
              <span className="text-3xl font-bold text-tv-accent citron-glow">${(symbol?.price ?? 0).toLocaleString(undefined, { minimumFractionDigits: symbol?.type === 'forex' ? 4 : 2 })}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${symbol && symbol.changePercent >= 0 ? 'bg-tv-green/10 text-tv-green' : 'bg-tv-red/10 text-tv-red'}`}>
                {symbol && symbol.changePercent >= 0 ? '+' : ''}{(symbol?.changePercent ?? 0).toFixed(2)}%
              </span>
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{symbol?.name || '---'}</span>
            </div>
          </div>

          {/* VERTICAL COMPARISON TICKETS STACK - SYNCED DATA */}
          {comparedSymbols && comparedSymbols.length > 0 && (
            <div className="absolute top-28 left-8 z-30 pointer-events-auto flex flex-col gap-2.5 max-h-[70%] overflow-y-auto thin-scrollbar py-2 pr-2 w-52">
              {comparedSymbols.map((s, i) => {
                const sColor = COMPARE_COLORS[i % COMPARE_COLORS.length];
                const hist = comparedHistory[s.ticker] || [];
                
                // Get ACTUAL current price from history for better sync
                const currentPrice = hist.length > 0 ? hist[hist.length - 1].close : (s.price || 0);
                
                // Calculate ACTUAL change relative to chart start for coherence
                let displayChange = s.changePercent || 0;
                if (hist.length > 1) {
                  const initialVisiblePrice = hist[0].close;
                  displayChange = ((currentPrice - initialVisiblePrice) / initialVisiblePrice) * 100;
                }
                
                const isPositive = displayChange >= 0;
                return (
                  <div 
                    key={s.ticker} 
                    className={`flex flex-col p-3 rounded-2xl border transition-all duration-500 backdrop-blur-xl group ${
                      s.visible ? 'bg-black/40 border-white/10 shadow-lg' : 'bg-black/10 border-white/5 opacity-30 grayscale'
                    }`}
                    style={s.visible ? { borderColor: `${sColor}33` } : {}}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0 shadow-[0_0_8px_currentColor]" style={{ background: sColor, color: sColor }}></div>
                        <span className="text-[10px] font-black text-white/90 truncate uppercase tracking-wider">{s.ticker}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={() => onToggleComparedVisibility?.(s.ticker)} 
                          className="p-1.5 hover:bg-white/10 rounded-lg text-white/30 hover:text-white transition-colors"
                        >
                          {s.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                        <button 
                          onClick={() => onRemoveCompared?.(s.ticker)} 
                          className="p-1.5 hover:bg-white/10 rounded-lg text-white/30 hover:text-tv-red transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-end justify-between">
                       <div className="flex flex-col">
                          <span className="text-xs font-mono font-black text-white">
                            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: s.type === 'forex' ? 4 : 2 })}
                          </span>
                       </div>
                       <div className={`flex items-center text-[9px] font-black px-1.5 py-0.5 rounded-md ${isPositive ? 'text-tv-green bg-tv-green/5' : 'text-tv-red bg-tv-red/5'}`}>
                         {isPositive ? <TrendingUp size={10} className="mr-0.5"/> : <TrendingDown size={10} className="mr-0.5"/>}
                         {Math.abs(displayChange).toFixed(2)}%
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div ref={chartRef} className="w-full h-full" />
       </div>

       {subIndicators.length > 0 && (
         <div className="flex flex-col gap-3 shrink-0 max-h-[35%] overflow-y-auto custom-scrollbar">
           {subIndicators.map(ind => (
             <div key={ind.id} className="h-40 glass rounded-[24px] overflow-hidden shrink-0 border border-white/5 relative">
               <IndicatorPanel data={data} indicator={ind} theme={theme} onToggleVisibility={onIndicatorToggle} height={160} />
             </div>
           ))}
         </div>
       )}
    </div>
  );
};

export default TradingChart;
