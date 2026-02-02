
import * as React from 'react';
import { 
  Activity, Search, Settings, 
  Sun, Moon, Globe, Bell, ChevronDown, 
  Zap, GitCompare 
} from 'lucide-react';
import { Interval, SymbolInfo, ChartSettings } from '../types';

interface NavigationProps {
  currentSymbol: SymbolInfo | undefined;
  currentInterval: Interval;
  onIntervalChange: (interval: Interval) => void;
  onSearchClick: () => void;
  onCompareClick: () => void;
  onIndicatorsClick: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  chartType: ChartSettings['chartType'];
  onChartTypeChange: (type: ChartSettings['chartType']) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentSymbol, currentInterval, onIntervalChange, onSearchClick, onCompareClick, onIndicatorsClick,
  theme, onToggleTheme, chartType, onChartTypeChange
}) => {
  const quickIntervals: Interval[] = ['1m', '5m', '15m', '1H', '4H', '1D'];
  const moreIntervals: Interval[] = ['1W', '1M', '1Y', 'ALL'];
  const [isIntervalDropdownOpen, setIsIntervalDropdownOpen] = React.useState(false);

  return (
    <nav className="h-14 glass border-b border-white/5 flex items-center px-4 justify-between z-50 select-none">
      {/* LEFT: TRADING CONTEXT */}
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 bg-tv-accent rounded flex items-center justify-center transform rotate-12 shadow-[0_0_10px_rgba(223,255,0,0.3)]">
            <Activity size={16} className="text-black font-bold" />
          </div>
          <span className="text-lg font-black tracking-tighter text-white hidden xl:block">
            AXION<span className="text-tv-accent">AI</span>
          </span>
        </div>

        <div className="h-6 w-[1px] bg-white/10 mx-2"></div>

        <button 
          onClick={onSearchClick}
          className="flex items-center h-9 hover:bg-white/5 rounded-lg transition-colors px-2 gap-2 group"
        >
          <Search size={16} className="text-tv-accent group-hover:scale-110 transition-transform" />
          <span className="font-bold text-sm text-white">{currentSymbol?.ticker || 'BTCUSDT'}</span>
          <span className="text-[9px] text-tv-muted uppercase bg-white/5 px-1 rounded">{currentSymbol?.exchange || 'BINANCE'}</span>
          <ChevronDown size={14} className="text-tv-muted" />
        </button>

        <div className="h-6 w-[1px] bg-white/10 mx-2"></div>

        <div className="flex items-center gap-0.5">
          {quickIntervals.map((int) => (
            <button
              key={int}
              onClick={() => onIntervalChange(int)}
              className={`px-2.5 h-8 rounded text-[11px] font-bold transition-all ${
                currentInterval === int 
                ? 'text-tv-accent bg-tv-accent/10 border border-tv-accent/20' 
                : 'text-tv-muted hover:text-white hover:bg-white/5'
              }`}
            >
              {int}
            </button>
          ))}
          
          <div className="relative">
            <button
              onClick={() => setIsIntervalDropdownOpen(!isIntervalDropdownOpen)}
              className={`px-2 h-8 rounded flex items-center gap-1 text-[11px] font-bold text-tv-muted hover:text-white transition-all`}
            >
              More <ChevronDown size={12} />
            </button>
            {isIntervalDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-24 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-1 z-50">
                {moreIntervals.map(int => (
                  <button
                    key={int}
                    onClick={() => { onIntervalChange(int); setIsIntervalDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 text-[10px] font-black uppercase text-white/40 hover:text-citron hover:bg-white/5 transition-all"
                  >
                    {int}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="h-6 w-[1px] bg-white/10 mx-2"></div>

        <button 
          onClick={onIndicatorsClick}
          className="px-3 h-8 hover:bg-white/5 rounded-lg flex items-center gap-2 text-xs font-bold text-white/70 transition-all border border-transparent hover:border-white/10"
        >
          <Zap size={14} className="text-citron" />
          <span>Indicators</span>
        </button>
      </div>

      {/* RIGHT: TOOLS */}
      <div className="flex items-center gap-2">
        <button 
          onClick={onCompareClick}
          className="flex items-center gap-2 px-3 h-9 bg-white/5 border border-white/10 rounded-xl hover:bg-citron hover:text-black hover:border-citron transition-all group"
          title="Compare Markets"
        >
          <GitCompare size={16} className="text-citron group-hover:text-black" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Compare</span>
        </button>

        <div className="h-6 w-[1px] bg-white/10 mx-1"></div>

        <button className="p-2.5 hover:bg-white/5 rounded-xl text-tv-muted hover:text-white transition-colors">
          <Bell size={18} />
        </button>
        <button className="p-2.5 hover:bg-white/5 rounded-xl text-tv-muted hover:text-white transition-colors">
          <Settings size={18} />
        </button>
        <button onClick={onToggleTheme} className="p-2.5 hover:bg-white/5 rounded-xl text-tv-muted hover:text-white transition-colors">
          {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </nav>
  );
};
