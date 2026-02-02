import * as React from 'react';
import { Navigation } from './components/Navigation';
import { TradingChart } from './components/TradingChart';
import { RightPanel } from './components/RightPanel';
import SearchModal from './components/SearchModal';
import IndicatorsModal from './components/IndicatorsModal';
import { ChatBot } from './components/ChatBot';
import { LayoutGrid, BarChart3, Wallet, ShieldCheck, History as HistoryIcon, HelpCircle, X, Zap, Cpu, Activity, Loader2, ArrowUpRight, ArrowDownLeft, Clock, BrainCircuit } from 'lucide-react';
import { SymbolInfo, Interval, CandleData, Indicator, ChartSettings, IndicatorType, InstitutionalDecision } from './types';
import { fetchHistory, fetchSymbolQuote, searchBinanceSymbols } from './services/api';
import { TradeLog } from './services/tradingEngine';
import { MultiAgentSupervisor } from './services/multiAgentSystem';

const { useState, useEffect, useCallback, useRef, useMemo } = React;

interface SidebarProps {
  onWalletClick: () => void;
  onHistoryClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onWalletClick, onHistoryClick }) => {
  return (
    <div className="w-16 glass h-full flex flex-col items-center py-6 gap-6 border-r border-white/5 shrink-0 z-20">
      {[
        { icon: <LayoutGrid size={22} />, active: true, action: () => {} },
        { icon: <BarChart3 size={22} />, active: false, action: () => {} },
        { icon: <Wallet size={22} />, active: false, action: onWalletClick },
        { icon: <ShieldCheck size={22} />, active: false, action: () => {} },
        { icon: <HistoryIcon size={22} />, active: false, action: onHistoryClick },
      ].map((item, i) => (
        <button 
          key={i} 
          onClick={item.action}
          className={`p-2.5 rounded-xl transition-all duration-300 ${item.active ? 'bg-tv-accent text-black shadow-[0_0_15px_rgba(223,255,0,0.4)]' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
        >
          {item.icon}
        </button>
      ))}
      <div className="mt-auto"><button className="p-2 text-white/20 hover:text-white"><HelpCircle size={22} /></button></div>
    </div>
  );
};

const HistoryDrawer: React.FC<{ isOpen: boolean; onClose: () => void; history: any[] }> = ({ isOpen, onClose, history }) => {
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] animate-in fade-in" onClick={onClose} />}
      <div className={`fixed inset-y-0 right-0 w-[420px] z-[100] transform transition-transform duration-500 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col bg-[#080808] p-8 border-l border-white/5 shadow-2xl relative">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-citron/10 rounded-2xl border border-citron/30"><Clock className="text-citron" size={28} /></div>
              <div>
                <span className="font-black uppercase tracking-[0.3em] text-xs block text-white/90">Neural Trade Archives</span>
                <span className="text-[9px] text-white/20 font-bold uppercase">Filled Transaction Records</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-white/5 rounded-2xl text-white/30"><X size={20} /></button>
          </div>
          <div className="flex-1 overflow-y-auto thin-scrollbar pr-2 space-y-3">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-10">
                <Activity size={64} className="mb-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.5em]">No Records Found</span>
              </div>
            ) : (
              history.map((trade, idx) => (
                <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-citron/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-xl ${trade.type === 'BUY' ? 'bg-tv-green/10 text-tv-green' : 'bg-tv-red/10 text-tv-red'}`}>
                      {trade.type === 'BUY' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{trade.ticker}</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded bg-white/5 ${trade.type === 'BUY' ? 'text-tv-green' : 'text-tv-red'}`}>{trade.type}</span>
                      </div>
                      <span className="text-[9px] text-white/30 font-mono">{new Date(trade.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-white font-mono">${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <div className="text-[8px] text-white/20 uppercase tracking-widest">Matched Fill Price</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const WalletDrawer: React.FC<{ isOpen: boolean; onClose: () => void; balance: number; setBalance: (v: number) => void; pnl: number }> = ({ isOpen, onClose, balance, setBalance, pnl }) => {
  const [inputVal, setInputVal] = useState(balance.toString());
  const totalValue = balance + pnl;
  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] animate-in fade-in" onClick={onClose} />}
      <div className={`fixed inset-y-0 right-0 w-[420px] z-[100] transform transition-transform duration-500 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col bg-[#080808] p-8 border-l border-white/5 shadow-2xl relative">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-citron/10 rounded-2xl border border-citron/30"><Wallet className="text-citron" size={28} /></div>
              <div>
                <span className="font-black uppercase tracking-[0.3em] text-xs block text-white/90">Nexus Vault Management</span>
                <span className="text-[9px] text-white/20 font-bold uppercase">Authorized Access Only</span>
              </div>
            </div>
            <button onClick={onClose} className="p-2.5 hover:bg-white/5 rounded-2xl text-white/30"><X size={20} /></button>
          </div>
          <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-2">
            <div className="bg-white/[0.03] p-6 rounded-3xl border border-white/10 relative overflow-hidden group">
              <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 block">Set Initial Capital (USD)</label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-citron font-black text-2xl">$</span>
                <input 
                  type="number" 
                  value={inputVal} 
                  onChange={e => { 
                    const val = e.target.value;
                    setInputVal(val); 
                    const v = parseFloat(val); 
                    if (!isNaN(v)) setBalance(v); 
                  }} 
                  className="w-full bg-black/60 border border-white/10 rounded-[24px] py-6 pl-14 pr-6 text-3xl font-black focus:border-citron outline-none transition-all font-mono text-white"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white/5 p-5 rounded-[24px] border border-white/5">
                  <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-2">Current P&L</div>
                  <div className={`text-xl font-black font-mono ${pnl >= 0 ? 'text-citron' : 'text-tv-red'}`}>
                    {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
               </div>
               <div className="bg-white/5 p-5 rounded-[24px] border border-white/5">
                  <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-2">Leverage Capacity</div>
                  <div className="text-xl font-black text-white font-mono">100.00x</div>
               </div>
            </div>
            <div className="bg-citron p-1 rounded-[32px] shadow-[0_20px_60px_rgba(223,255,0,0.15)] group">
              <div className="bg-black/90 rounded-[30px] p-8 border border-citron/20 group-hover:bg-black/80 transition-all">
                <span className="text-[10px] font-black text-citron uppercase tracking-[0.4em] mb-3 block">Total Account Valuation</span>
                <div className="text-5xl font-black text-white tracking-tighter font-mono">
                  ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const DEFAULT_SYMBOL: SymbolInfo = {
  ticker: 'BTCUSDT',
  name: 'Bitcoin / Tether',
  exchange: 'BINANCE',
  type: 'crypto',
  price: 0,
  change: 0,
  changePercent: 0,
  volume: 0,
  visible: true
};

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(false); // On ne bloque plus l'UI du tout
  const [isChartLoading, setIsChartLoading] = useState(true);
  
  const [currentSymbol, setCurrentSymbol] = useState<SymbolInfo>(() => {
    try {
      const saved = localStorage.getItem('nexus_last_symbol');
      return saved ? JSON.parse(saved) : DEFAULT_SYMBOL;
    } catch { return DEFAULT_SYMBOL; }
  });
  const [chartInterval, setChartInterval] = useState<Interval>('1H');
  const [history, setHistory] = useState<CandleData[]>([]);
  const [comparedSymbols, setComparedSymbols] = useState<SymbolInfo[]>([]);
  const [comparedHistory, setComparedHistory] = useState<Record<string, CandleData[]>>({});
  const [indicators, setIndicators] = useState<Indicator[]>([{ id: 'vol-1', type: 'VOL', period: 20, color: '#DFFF00', visible: true, lineWidth: 1, lineStyle: 'solid', showMa: true, upColor: '#089981', downColor: '#f23645', maColor: '#DFFF00' }]);
  const [settings, setSettings] = useState<ChartSettings>({ theme: 'dark', showGrid: true, timezone: 'UTC', chartType: 'candlestick' });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<'main' | 'compare'>('main');
  const [isIndicatorsOpen, setIsIndicatorsOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [lastOrder, setLastOrder] = useState<{side: 'BUY' | 'SELL', ticker: string, price: number} | null>(null);
  const [lastExecutionPrice, setLastExecutionPrice] = useState<number | null>(() => {
    const saved = localStorage.getItem('nexus_last_exec_price');
    return saved ? parseFloat(saved) : null;
  });

  const [isBotActive, setIsBotActive] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [botLogs, setBotLogs] = useState<TradeLog[]>([]);
  const [botPnl, setBotPnl] = useState(() => {
    const saved = localStorage.getItem('nexus_pnl');
    return saved ? parseFloat(saved) : 0;
  });
  const [walletBalance, setWalletBalance] = useState(() => { 
    const saved = localStorage.getItem('nexus_wallet_balance'); 
    return saved ? parseFloat(saved) : 10000; 
  });
  const [leverage, setLeverage] = useState(() => {
    const saved = localStorage.getItem('nexus_leverage');
    return saved ? parseInt(saved) : 10;
  });
  const [alertHistory, setAlertHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('nexus_alert_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [lastAgentDecision, setLastAgentDecision] = useState<InstitutionalDecision | null>(null);
  
  const supervisorRef = useRef<MultiAgentSupervisor>(new MultiAgentSupervisor());
  const [isTradeInProgress, setIsTradeInProgress] = useState(() => {
    const saved = localStorage.getItem('nexus_trade_active');
    return saved === 'true';
  });
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);

  useEffect(() => { 
    localStorage.setItem('nexus_wallet_balance', walletBalance.toString()); 
    localStorage.setItem('nexus_pnl', botPnl.toString());
    localStorage.setItem('nexus_leverage', leverage.toString());
    localStorage.setItem('nexus_alert_history', JSON.stringify(alertHistory));
    localStorage.setItem('nexus_trade_active', isTradeInProgress.toString());
    if (lastExecutionPrice) localStorage.setItem('nexus_last_exec_price', lastExecutionPrice.toString());
    localStorage.setItem('nexus_last_symbol', JSON.stringify(currentSymbol));
  }, [walletBalance, botPnl, leverage, alertHistory, lastExecutionPrice, currentSymbol, isTradeInProgress]);

  const unrealizedPnl = useMemo(() => {
    if (isTradeInProgress && lastExecutionPrice && currentSymbol.price) {
      return ((currentSymbol.price - lastExecutionPrice) / lastExecutionPrice) * walletBalance * leverage;
    }
    return 0;
  }, [isTradeInProgress, lastExecutionPrice, currentSymbol.price, walletBalance, leverage]);

  const totalCurrentPnl = botPnl + unrealizedPnl;

  const addLog = useCallback((type: TradeLog['type'], message: string, ticker?: string, targetPrice?: number, origin: 'MANUAL' | 'AI' = 'MANUAL', status: 'PENDING' | 'EXECUTED' = 'PENDING') => {
    const newLog: TradeLog = { 
      id: Math.random().toString(36).substr(2, 9), 
      timestamp: Date.now(), 
      type, 
      message, 
      ticker, 
      targetPrice, 
      origin,
      status
    };
    setBotLogs(prev => [newLog, ...prev]);
    return newLog.id;
  }, []);

  const triggerOrder = useCallback((side: 'BUY' | 'SELL', priceOverride?: number, origin: 'MANUAL' | 'AI' = 'MANUAL') => {
    const targetPrice = priceOverride !== undefined ? priceOverride : currentSymbol.price;
    const tolerance = currentSymbol.price * 0.0005;
    const isMarketFill = Math.abs(currentSymbol.price - targetPrice) < tolerance;
    if (isMarketFill) {
       const logId = addLog(side, `Market Execution triggered at $${currentSymbol.price.toLocaleString()}.`, currentSymbol.ticker, currentSymbol.price, origin, 'EXECUTED');
       finalizeTrade(side, currentSymbol.price, origin, logId);
    } else {
       const logId = addLog(side, `Target price set at $${targetPrice.toLocaleString()}. Monitoring liquidity...`, currentSymbol.ticker, targetPrice, origin, 'PENDING');
       setPendingOrders(prev => [...prev, { logId, side, targetPrice, ticker: currentSymbol.ticker, origin, timestamp: Date.now() }]);
    }
  }, [currentSymbol, addLog]);

  const finalizeTrade = useCallback((side: 'BUY' | 'SELL', price: number, origin: 'MANUAL' | 'AI', logId?: string) => {
    setLastOrder({ side, ticker: currentSymbol.ticker, price });
    setAlertHistory(prev => [{ type: side, ticker: currentSymbol.ticker, price: price, timestamp: Date.now(), origin }, ...prev]);
    if (logId) {
      setBotLogs(prev => prev.map(l => l.id === logId ? { ...l, status: 'EXECUTED', message: 'ORDER EXECUTED (MATCHED)' } : l));
    }
    if (side === 'BUY') { 
      setLastExecutionPrice(price); 
      setIsTradeInProgress(true); 
    } else if (side === 'SELL') {
      const pnl = (price - (lastExecutionPrice || price)) / (lastExecutionPrice || 1) * walletBalance * leverage;
      setBotPnl(p => p + pnl);
      setLastExecutionPrice(null);
      setIsTradeInProgress(false);
    }
    setTimeout(() => setLastOrder(null), 3500);
  }, [currentSymbol, lastExecutionPrice, walletBalance, leverage]);

  useEffect(() => {
    if (pendingOrders.length === 0) return;
    const tolerance = currentSymbol.price * 0.0005;
    const filledIndices: number[] = [];
    pendingOrders.forEach((order, idx) => {
      const isFilled = Math.abs(currentSymbol.price - order.targetPrice) < tolerance || 
                       (order.side === 'BUY' && currentSymbol.price <= order.targetPrice) ||
                       (order.side === 'SELL' && currentSymbol.price >= order.targetPrice);
      if (isFilled && order.ticker === currentSymbol.ticker) {
        filledIndices.push(idx);
        finalizeTrade(order.side, currentSymbol.price, order.origin, order.logId);
      }
    });
    if (filledIndices.length > 0) {
      setPendingOrders(prev => prev.filter((_, i) => !filledIndices.includes(i)));
    }
  }, [currentSymbol.price, pendingOrders, finalizeTrade]);

  useEffect(() => {
    if (!isBotActive) return;
    const orchestrationInterval = setInterval(async () => {
      if (isTransmitting) return; 
      try {
        setIsTransmitting(true);
        const decision = await supervisorRef.current.runFullAnalysis(currentSymbol, history, indicators, walletBalance, leverage, isTradeInProgress);
        setLastAgentDecision(decision);
        if (decision.decision.authorized && (decision.decision.final_action === 'BUY' || decision.decision.final_action === 'SELL')) {
           const action = decision.decision.final_action as 'BUY' | 'SELL';
           if (action === 'BUY' && !isTradeInProgress) triggerOrder('BUY', decision.technical.trigger_price, 'AI');
           else if (action === 'SELL' && isTradeInProgress) triggerOrder('SELL', decision.technical.trigger_price, 'AI');
        }
      } catch (e) {
        console.error("Neural Orchestration Error:", e);
      } finally {
        setIsTransmitting(false);
      }
    }, 15000);
    return () => clearInterval(orchestrationInterval);
  }, [isBotActive, currentSymbol, history, indicators, walletBalance, leverage, isTransmitting, triggerOrder, isTradeInProgress]);

  useEffect(() => {
    let isMounted = true;
    setIsChartLoading(true);
    
    const loadData = async () => {
      try {
        // Tentative de chargement rapide
        const historyPromise = fetchHistory(currentSymbol.ticker, chartInterval, currentSymbol.type);
        const res = await historyPromise;
        
        if (isMounted) {
          setHistory(res.data);
          setIsChartLoading(false);
        }

        // Quote en parallèle pour ne pas bloquer
        fetchSymbolQuote(currentSymbol).then(quote => {
          if (isMounted && quote) {
            setCurrentSymbol(s => ({...s, ...quote}));
          }
        });
      } catch (e) {
        if (isMounted) setIsChartLoading(false);
      }
    };
    
    loadData();
    
    const refresh = setInterval(() => {
      fetchSymbolQuote(currentSymbol).then(q => { if (q && isMounted) setCurrentSymbol(s => ({...s, ...q})); });
      if (isMounted && comparedSymbols.length > 0) {
        comparedSymbols.forEach(async (s) => {
          const q = await fetchSymbolQuote(s);
          if (q && isMounted) {
            setComparedSymbols(prev => 
              prev.map(item => item.ticker === s.ticker ? { ...item, ...q } : item)
            );
          }
        });
      }
    }, 10000);
    
    return () => { isMounted = false; clearInterval(refresh); };
  }, [currentSymbol.ticker, chartInterval]);

  useEffect(() => {
    if (comparedSymbols.length === 0) return;
    let isMounted = true;
    const syncComparisons = async () => {
      const updates: Record<string, CandleData[]> = {};
      const promises = comparedSymbols.map(async (s) => {
        try {
          const res = await fetchHistory(s.ticker, chartInterval, s.type);
          if (isMounted) updates[s.ticker] = res.data;
        } catch (e) {}
      });
      await Promise.all(promises);
      if (isMounted) setComparedHistory(prev => ({ ...prev, ...updates }));
    };
    syncComparisons();
    return () => { isMounted = false; };
  }, [chartInterval, comparedSymbols.length]);

  useEffect(() => {
    const t = setTimeout(() => { searchBinanceSymbols(""); }, 3000);
    return () => clearTimeout(t);
  }, []);

  const handleSymbolChangeFromBot = useCallback((t: string, type: 'stock' | 'crypto' | 'forex' | 'etf') => {
    const ticker = t.toUpperCase();
    setHistory([]);
    setCurrentSymbol({ ticker, type, name: ticker, exchange: (type === 'crypto' || ticker.endsWith('USDT')) ? 'BINANCE' : 'YAHOO', price: 0, change: 0, changePercent: 0, volume: 0, visible: true });
  }, []);

  const handleIndicatorAction = useCallback((action: 'add' | 'remove' | 'hide' | 'show', type: string, period?: number, color?: string) => {
    const targetType = type.toUpperCase();
    if (targetType === 'ALL' && action === 'remove') { setIndicators([]); return; }
    
    if (action === 'add') {
      const newInd: Indicator = { 
        id: Math.random().toString(36).substr(2, 9), 
        type: targetType as IndicatorType, 
        period: period || (targetType === 'VOL' ? 20 : 14), 
        color: color || '#DFFF00', 
        visible: true, 
        lineWidth: 2, 
        lineStyle: 'solid',
        ...(targetType === 'VOL' ? { showMa: true, upColor: '#089981', downColor: '#f23645', maColor: '#DFFF00' } : {})
      };
      setIndicators(prev => {
        if (targetType === 'VOL' && prev.some(i => i.type === 'VOL')) return prev;
        return [...prev, newInd];
      });
    } else if (action === 'remove') {
      setIndicators(prev => prev.filter(i => i.type !== targetType));
    } else if (action === 'hide') {
      setIndicators(prev => prev.map(i => i.type === targetType ? { ...i, visible: false } : i));
    } else if (action === 'show') {
      setIndicators(prev => prev.map(i => i.type === targetType ? { ...i, visible: true } : i));
    }
  }, []);

  const handleComparisonAction = useCallback(async (action: 'add' | 'remove' | 'hide' | 'show', ticker: string, info?: SymbolInfo) => {
    if (action === 'add' && info) {
      setComparedSymbols(prev => {
        if (prev.find(s => s.ticker === ticker)) return prev;
        return [...prev, { ...info, visible: true }];
      });
      try {
        const res = await fetchHistory(ticker, chartInterval, info.type);
        setComparedHistory(prev => ({ ...prev, [ticker]: res.data }));
      } catch (e) {}
    } else if (action === 'remove') {
      setComparedSymbols(prev => prev.filter(s => s.ticker !== ticker));
      setComparedHistory(prev => { const next = { ...prev }; delete next[ticker]; return next; });
    } else if (action === 'hide' || action === 'show') {
      setComparedSymbols(prev => prev.map(s => s.ticker === ticker ? { ...s, visible: action === 'show' } : s));
    }
  }, [chartInterval]);

  const onSearchSelect = useCallback((symbol: SymbolInfo) => {
    if (searchMode === 'main') { setHistory([]); setCurrentSymbol(symbol); }
    else { handleComparisonAction('add', symbol.ticker, symbol); }
    setIsSearchOpen(false);
  }, [searchMode, handleComparisonAction]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#050505] text-white overflow-hidden animate-in fade-in duration-500">
      <Navigation currentSymbol={currentSymbol} currentInterval={chartInterval} onIntervalChange={setChartInterval} onSearchClick={() => { setSearchMode('main'); setIsSearchOpen(true); }} onCompareClick={() => { setSearchMode('compare'); setIsSearchOpen(true); }} onIndicatorsClick={() => setIsIndicatorsOpen(true)} theme={settings.theme} onToggleTheme={() => setSettings(s => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))} chartType={settings.chartType} onChartTypeChange={ct => setSettings(s => ({ ...s, chartType: ct }))} />
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar onWalletClick={() => setIsWalletOpen(true)} onHistoryClick={() => setIsHistoryOpen(true)} />
        <main className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden h-full">
          <section className="flex-[3.2] min-w-0 h-full overflow-hidden relative">
            {isChartLoading && history.length === 0 && (
               <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm rounded-[32px]"><Cpu size={32} className="text-citron animate-spin mb-4" /><span className="text-[10px] font-black uppercase tracking-[0.4em] text-citron/40">Synchronizing...</span></div>
            )}
            <TradingChart data={history} indicators={indicators} symbol={currentSymbol} interval={chartInterval} onIndicatorToggle={(id) => setIndicators(prev => prev.map(i => i.id === id ? { ...i, visible: !i.visible } : i))} theme={settings.theme} lastOrder={lastOrder} chartType={settings.chartType} comparedSymbols={comparedSymbols} comparedHistory={comparedHistory} onRemoveCompared={(t) => handleComparisonAction('remove', t)} onToggleComparedVisibility={(t) => { const s = comparedSymbols.find(x => x.ticker === t); handleComparisonAction(s?.visible ? 'hide' : 'show', t); }} />
          </section>
          <aside className="flex-1 min-w-[340px] max-w-[400px] h-full overflow-hidden hidden lg:block">
            <RightPanel isBotActive={isBotActive} onToggleBot={() => setIsBotActive(!isBotActive)} isTransmitting={isTransmitting} botLogs={botLogs} onRemoveLog={(id) => setBotLogs(prev => prev.filter(l => l.id !== id))} botPnl={totalCurrentPnl} isTradeInProgress={isTradeInProgress} currentSymbol={currentSymbol} onTrade={triggerOrder} walletBalance={walletBalance} leverage={leverage} setLeverage={setLeverage} lastAgentDecision={lastAgentDecision} />
          </aside>
        </main>
        <WalletDrawer isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} balance={walletBalance} setBalance={setWalletBalance} pnl={totalCurrentPnl} />
        <HistoryDrawer isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} history={alertHistory} />
      </div>
      <footer className="h-8 shrink-0 glass border-t border-white/5 flex items-center px-6 text-[9px] text-white/30 justify-between uppercase tracking-widest font-black">
        <div className="flex gap-6 items-center">
          <span className="flex items-center gap-2"><div className={`w-1.5 h-1.5 rounded-full ${isBotActive ? 'bg-citron shadow-[0_0_8px_#DFFF00]' : 'bg-tv-green'}`}></div> STATUS: {isBotActive ? 'ACTIVE' : 'STANDBY'}</span>
          <span className="flex items-center gap-2 text-citron/60"><BrainCircuit size={10}/> {isTransmitting ? 'TRANSMITTING NEURAL COMMAND...' : 'MULTI-AGENT ORCHESTRATOR V2.0'}</span>
        </div>
      </footer>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onSelect={onSearchSelect} marketMap={{}} />
      <IndicatorsModal isOpen={isIndicatorsOpen} onClose={() => setIsIndicatorsOpen(false)} activeIndicators={indicators} onAddIndicator={(ind) => setIndicators(prev => [...prev, ind])} onUpdateIndicator={(ind) => setIndicators(prev => prev.map(i => i.id === ind.id ? ind : i))} onRemoveIndicator={(id) => setIndicators(prev => prev.filter(i => i.id !== id))} />
      <ChatBot onSymbolChange={handleSymbolChangeFromBot} onIndicatorAction={handleIndicatorAction} onAddComparison={(t, type) => handleComparisonAction('add', t, { ticker: t, type, name: t, exchange: '', price: 0, change: 0, changePercent: 0, volume: 0, visible: true })} onComparisonAction={handleComparisonAction} onToggleWallet={setIsWalletOpen} onIntervalChange={setChartInterval} onToggleBot={setIsBotActive} currentHistory={history} onTradeExecute={(side, price) => triggerOrder(side, price)} />
    </div>
  );
};
export default App;