
import * as React from 'react';
import ApexCharts from 'apexcharts';
import { CandleData, Indicator } from '../types';
import { 
  calculateRSI, 
  calculateMACD, 
  calculateStochastic, 
  calculateSMA, 
  calculateATR, 
  calculateMFI, 
  calculateADX, 
  calculateOBV 
} from '../services/technicalAnalysis';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface IndicatorPanelProps {
  data: CandleData[];
  indicator: Indicator;
  onToggleVisibility?: (id: string) => void;
  height?: number;
  groupId?: string;
  theme?: 'dark' | 'light';
}

const IndicatorPanel: React.FC<IndicatorPanelProps> = ({ 
  data = [], indicator, onToggleVisibility, height = 160, groupId = "market-charts", theme = 'dark'
}) => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const chartInstance = React.useRef<ApexCharts | null>(null);

  const series = React.useMemo(() => {
    if (!data || data.length === 0 || !indicator || indicator.visible === false) return [];
    const times = data.map(d => d.time);

    try {
      switch (indicator.type) {
        case 'VOL':
          const volSeries: any[] = [{
            name: 'Volume',
            type: 'bar',
            data: data.map((d) => ({ x: d.time, y: d.volume || 0, fillColor: d.close >= d.open ? '#089981' : '#f23645' }))
          }];
          if (indicator.showMa) {
             const maValues = calculateSMA(data, indicator.period, 'volume');
             volSeries.push({ name: `Vol MA`, type: 'line', data: times.map((t, i) => ({ x: t, y: maValues[i] || null })), color: indicator.maColor || '#DFFF00' });
          }
          return volSeries;

        case 'RSI':
          const rsiValues = calculateRSI(data, indicator.period);
          return [{ name: `RSI`, data: times.map((t, i) => ({ x: t, y: rsiValues[i] || null })), color: indicator.color }];

        case 'MFI':
          const mfiValues = calculateMFI(data, indicator.period);
          return [{ name: `MFI`, data: times.map((t, i) => ({ x: t, y: mfiValues[i] || null })), color: indicator.color }];

        case 'ATR':
          const atrValues = calculateATR(data, indicator.period);
          return [{ name: `ATR`, data: times.map((t, i) => ({ x: t, y: atrValues[i] || null })), color: indicator.color }];

        case 'ADX':
          const adxResult = calculateADX(data, indicator.period);
          return [
            { name: `ADX`, data: times.map((t, i) => ({ x: t, y: adxResult.adx[i] || null })), color: indicator.color },
            { name: `+DI`, data: times.map((t, i) => ({ x: t, y: adxResult.plusDI[i] || null })), color: '#089981' },
            { name: `-DI`, data: times.map((t, i) => ({ x: t, y: adxResult.minusDI[i] || null })), color: '#f23645' }
          ];

        case 'OBV':
          const obvValues = calculateOBV(data);
          return [{ name: `OBV`, data: times.map((t, i) => ({ x: t, y: obvValues[i] || null })), color: indicator.color || '#DFFF00' }];

        case 'MACD':
          const macdResult = calculateMACD(data, indicator.fastPeriod || 12, indicator.period || 26, indicator.signalPeriod || 9);
          return [
            { name: 'MACD', data: times.map((t, i) => ({ x: t, y: macdResult.macd[i] || null })), color: indicator.color },
            { name: 'Signal', data: times.map((t, i) => ({ x: t, y: macdResult.signal[i] || null })), color: '#ff9800' },
            { name: 'Histogram', type: 'bar', data: times.map((t, i) => ({ x: t, y: macdResult.histogram[i] || 0, fillColor: (macdResult.histogram[i] || 0) >= 0 ? '#089981' : '#f23645' })) }
          ];

        case 'STOCH':
          const stochResult = calculateStochastic(data, indicator.period, indicator.signalPeriod);
          return [
            { name: '%K', data: times.map((t, i) => ({ x: t, y: stochResult.k[i] || null })), color: indicator.color },
            { name: '%D', data: times.map((t, i) => ({ x: t, y: stochResult.d[i] || null })), color: '#ff9800' }
          ];

        default: return [];
      }
    } catch (e) { return []; }
  }, [data, indicator]);

  React.useEffect(() => {
    if (!chartRef.current || series.length === 0) return;

    const isOscillator = indicator && ['RSI', 'STOCH', 'MFI', 'ADX'].includes(indicator.type);
    const options: any = {
      chart: { 
        id: `chart-${indicator?.id}`, 
        group: groupId, 
        type: 'line',
        height: height,
        background: 'transparent', 
        toolbar: { show: false }, 
        animations: { enabled: false }
      },
      series: series,
      theme: { mode: theme },
      stroke: { width: 1.5, curve: 'straight' },
      xaxis: { type: 'datetime', labels: { show: false }, axisTicks: { show: false }, axisBorder: { show: false } },
      yaxis: { 
        opposite: true, 
        labels: { 
          style: { colors: '#787b86', fontSize: '10px' }, 
          minWidth: 50, 
          formatter: (val: number) => (val === null || isNaN(val)) ? '' : val.toFixed(2)
        },
        min: isOscillator ? 0 : undefined,
        max: isOscillator ? 100 : undefined,
        tickAmount: 3
      },
      grid: { 
        borderColor: 'rgba(255, 255, 255, 0.05)', 
        padding: { top: 35, bottom: 5, left: 10, right: 10 }
      },
      legend: { show: false },
      tooltip: { theme: theme, shared: false }
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
  }, [theme, indicator?.type, groupId, series, height]);

  if (!indicator || !data || data.length === 0 || series.length === 0) return null;

  return (
    <div className="w-full h-full relative overflow-hidden bg-black/20">
      <div ref={chartRef} className="w-full h-full" />
      <div className="absolute top-3 left-6 flex items-center gap-2 z-10">
        <button onClick={() => onToggleVisibility?.(indicator.id)} className="p-1.5 rounded-lg bg-black/60 border border-white/10 text-white/40 hover:text-citron backdrop-blur-md">
          {indicator.visible ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
        <span className="text-[10px] font-black uppercase text-tv-accent tracking-widest bg-black/60 px-3 py-1 rounded-lg border border-white/10 shadow-lg backdrop-blur-md flex items-center gap-2">
          {indicator.type} <span className="text-white/20">/</span> {indicator.period}
        </span>
      </div>
    </div>
  );
};

export default IndicatorPanel;
