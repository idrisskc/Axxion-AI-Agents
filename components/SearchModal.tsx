
import * as React from 'react';
import { Search, X, Loader2, Zap, Globe, BarChart3, Coins, Repeat, Command, ArrowRight } from 'lucide-react';
import { searchBinanceSymbols, searchYahooSymbols, ASSETS } from '../services/api';
import { SymbolInfo } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (symbol: SymbolInfo) => void;
  marketMap: Record<string, SymbolInfo>;
}

type MarketCategory = 'Crypto' | 'Stocks' | 'Forex' | 'ETF';

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onSelect, marketMap }) => {
  const [query, setQuery] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState<MarketCategory>('Crypto');
  const [results, setResults] = React.useState<SymbolInfo[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  React.useEffect(() => {
    const performSearch = async () => {
      setIsLoading(true);
      try {
        let searchData: SymbolInfo[] = [];
        if (activeCategory === 'Crypto') {
          searchData = await searchBinanceSymbols(query);
        } else if (query.length > 1) {
          // Utilisation de la recherche Yahoo Finance
          searchData = await searchYahooSymbols(query);
          
          if (activeCategory === 'Forex') {
            searchData = searchData.filter(s => s.type === 'forex' || s.ticker.includes('=X') || s.ticker.length === 6);
          } else if (activeCategory === 'ETF') {
            searchData = searchData.filter(s => s.type === 'etf');
          } else {
            searchData = searchData.filter(s => s.type === 'stock');
          }
        } else {
          // Favoris par défaut
          const list = activeCategory === 'Stocks' ? ASSETS.STOCKS : activeCategory === 'Forex' ? ASSETS.FOREX : ASSETS.ETFS;
          searchData = list
            .map(ticker => {
              const info = marketMap[ticker];
              if (info) return info;
              return { 
                ticker, 
                name: ticker, 
                exchange: activeCategory === 'Forex' ? 'FX' : 'YAHOO', 
                type: activeCategory.toLowerCase() as any, 
                price: 0, 
                change: 0, 
                changePercent: 0, 
                volume: 0 
              };
            })
            .filter(s => s.ticker.toLowerCase().includes(query.toLowerCase()));
        }
        setResults(searchData);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    const debounce = setTimeout(performSearch, query ? 400 : 0);
    return () => clearTimeout(debounce);
  }, [query, activeCategory, marketMap]);

  if (!isOpen) return null;

  const categories: { label: MarketCategory; icon: any }[] = [
    { label: 'Crypto', icon: <Coins size={14} /> },
    { label: 'Stocks', icon: <BarChart3 size={14} /> },
    { label: 'Forex', icon: <Repeat size={14} /> },
    { label: 'ETF', icon: <Globe size={14} /> },
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center backdrop-blur-[2px] p-4 transition-all duration-300 animate-in fade-in" 
      onClick={onClose}
    >
      <div 
        className="bg-[#050505]/60 backdrop-blur-2xl w-full max-w-3xl max-h-[80vh] rounded-[32px] border border-white/10 flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center p-6 bg-white/[0.02] border-b border-white/5">
          <div className="bg-citron/10 p-3 rounded-2xl mr-4 shadow-[0_0_15px_rgba(223,255,0,0.1)]">
            <Search className="text-citron" size={22} />
          </div>
          <input 
            ref={inputRef} 
            type="text" 
            placeholder={`Search ${activeCategory} via Yahoo Node...`}
            className="flex-1 bg-transparent border-none outline-none text-2xl text-white placeholder-white/20 font-black tracking-tight"
            value={query} 
            onChange={e => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-3 ml-2">
            {isLoading && <Loader2 className="animate-spin text-citron" size={20} />}
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all text-white/30 hover:text-white"><X size={20} /></button>
          </div>
        </div>

        <div className="flex px-6 py-4 gap-2 bg-black/10 overflow-x-auto no-scrollbar border-b border-white/5 items-center shrink-0">
          {categories.map(cat => (
             <button 
               key={cat.label} 
               onClick={() => { setActiveCategory(cat.label); setQuery(''); }}
               className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 border ${
                 activeCategory === cat.label 
                 ? 'bg-citron text-black border-citron shadow-[0_0_15px_rgba(223,255,0,0.3)]' 
                 : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white'
               }`}
             >
               {cat.icon} {cat.label}
             </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/5">
          {results.length > 0 ? (
            <div className="p-2">
              {results.map((symbol, idx) => (
                <div 
                  key={`${symbol.ticker}-${idx}`} 
                  className="flex items-center justify-between p-4 px-6 rounded-2xl hover:bg-white/[0.03] cursor-pointer transition-all group border border-transparent hover:border-white/5 mx-2 my-1" 
                  onClick={() => { onSelect(symbol); onClose(); }}
                >
                  <div className="flex items-center gap-4">
                     <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center font-black text-white/20 text-xl group-hover:text-citron group-hover:bg-citron/10 transition-all border border-white/5">
                       {symbol.ticker[0]}
                     </div>
                     <div className="flex flex-col">
                       <div className="flex items-center gap-2">
                         <span className="font-black text-lg text-white group-hover:text-citron transition-colors">{symbol.ticker}</span>
                         <span className="text-[8px] px-1.5 py-0.5 rounded-lg bg-white/5 text-white/40 uppercase font-black tracking-widest">{symbol.exchange}</span>
                       </div>
                       <div className="text-[10px] text-white/30 uppercase font-bold tracking-wider truncate max-w-[200px]">{symbol.name}</div>
                     </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right flex flex-col items-end">
                       <div className="text-lg font-mono font-black text-white tracking-tighter">
                         {symbol.price ? symbol.price.toLocaleString(undefined, { minimumFractionDigits: symbol.type === 'forex' ? 4 : 2 }) : '---'}
                       </div>
                    </div>
                    <ArrowRight className="text-white/10 group-hover:text-citron transition-all group-hover:translate-x-1" size={16} />
                  </div>
                </div>
              ))}
            </div>
          ) : !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
               <Zap size={48} className="mb-4 text-citron" />
               <div className="text-xs font-black uppercase tracking-[0.5em]">Nexus Node Standby</div>
            </div>
          )}
        </div>

        <div className="p-4 bg-black/20 backdrop-blur-md border-t border-white/5 flex justify-between items-center px-8 text-[9px] font-black text-white/20 tracking-[0.2em] uppercase shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><div className="w-1 h-1 rounded-full bg-citron animate-pulse shadow-[0_0_5px_#DFFF00]"></div> YAHOO FINANCE NODE</span>
            <span className="text-white/10">•</span>
            <span>SECURE REAL-TIME FEED</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SearchModal;
