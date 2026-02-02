
import React, { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';
import { 
  TrendingUp, Zap, ArrowUpRight, ArrowDownLeft, 
  RefreshCw, X as XIcon, Wallet, BrainCircuit, Activity, 
  Database, Radio, AlertTriangle, Clock, CheckCircle2
} from 'lucide-react';
import { TradeLog } from '../services/tradingEngine';
import { SymbolInfo, InstitutionalDecision } from '../types';

interface RightPanelProps {
  isBotActive: boolean;
  onToggleBot: () => void;
  isTransmitting?: boolean;
  botLogs: TradeLog[];
  onRemoveLog?: (id: string) => void;
  botPnl: number;
  isTradeInProgress?: boolean;
  currentSymbol?: SymbolInfo;
  onTrade?: (side: 'BUY' | 'SELL', price: number, origin: 'MANUAL' | 'AI') => void;
  walletBalance: number;
  leverage: number;
  setLeverage: (val: number) => void;
  lastAgentDecision?: InstitutionalDecision | null;
}

export const RightPanel: React.FC<RightPanelProps> = ({ 
  isBotActive, 
  onToggleBot, 
  isTransmitting = false,
  botLogs, 
  onRemoveLog, 
  botPnl, 
  isTradeInProgress = false,
  currentSymbol, 
  onTrade,
  walletBalance,
  leverage,
  setLeverage,
  lastAgentDecision
}) => {
  const [orderPrice, setOrderPrice] = useState<string>('');
  const [isManualPrice, setIsManualPrice] = useState(false);
  const [showJson, setShowJson] = useState(false);

  const totalValue = walletBalance + botPnl;

  useEffect(() => {
    if (currentSymbol && !isManualPrice) {
      setOrderPrice(currentSymbol.price.toString());
    }
  }, [currentSymbol?.price, isManualPrice]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOrderPrice(e.target.value);
    setIsManualPrice(true);
  };

  const resetToMarket = () => {
    setIsManualPrice(false);
    if (currentSymbol) setOrderPrice(currentSymbol.price.toString());
  };

  const handleExecute = (side: 'BUY' | 'SELL') => {
    const price = parseFloat(orderPrice);
    if (!isNaN(price)) {
      onTrade?.(side, price, 'MANUAL');
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto custom-scrollbar pr-2 pb-8">
      
      {/* 1. MULTI-AGENT REASONING */}
      <GlassCard title="Multi-Agent Reasoning" className={`shrink-0 border-citron/40 shadow-[0_0_40px_rgba(223,255,0,0.1)] transition-all duration-500 ${isTransmitting ? 'bg-citron/[0.03]' : ''}`}>
        <div className="flex flex-col gap-3 mt-2">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <BrainCircuit size={18} className={`text-citron ${isTransmitting ? 'animate-spin' : 'animate-pulse'}`} />
                 <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Supervisor Node Active</span>
              </div>
              {isTransmitting ? (
                 <div className="flex items-center gap-1.5 px-2 py-1 bg-citron/10 border border-citron/30 rounded-lg">
                    <Radio size={10} className="text-citron animate-pulse" />
                    <span className="text-[8px] font-black text-citron uppercase">Transmitting...</span>
                 </div>
              ) : (
                <button 
                  onClick={() => setShowJson(!showJson)}
                  className="text-[8px] font-black px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-citron transition-all"
                >
                  {showJson ? 'HIDE JSON' : 'VIEW EXPLAINABLE'}
                </button>
              )}
           </div>

           {lastAgentDecision ? (
             <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                   <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                      <div className="text-[8px] text-white/30 uppercase font-bold mb-1">Regime</div>
                      <div className="text-xs font-black text-citron">{lastAgentDecision.regime.regime} <span className="text-white/40 text-[9px] font-mono">({(lastAgentDecision.regime.confidence * 100).toFixed(0)}%)</span></div>
                   </div>
                   <div className="bg-black/40 p-2 rounded-xl border border-white/5">
                      <div className="text-[8px] text-white/30 uppercase font-bold mb-1">Volatility</div>
                      <div className={`text-xs font-black flex items-center gap-1 ${lastAgentDecision.alpha.volatility_state === 'STORM' ? 'text-tv-red' : 'text-green-500'}`}>
                        {lastAgentDecision.alpha.volatility_state === 'STORM' && <AlertTriangle size={10}/>}
                        {lastAgentDecision.alpha.volatility_state}
                      </div>
                   </div>
                </div>

                {showJson ? (
                  <div className="mt-2 bg-black/80 rounded-xl p-3 border border-citron/20 font-mono text-[9px] text-citron/80 overflow-x-auto thin-scrollbar max-h-40 whitespace-pre">
                    {JSON.stringify(lastAgentDecision, null, 2)}
                  </div>
                ) : (
                  <div className="space-y-2 mt-1">
                    <div className="flex justify-between items-center text-[9px]">
                       <span className="text-white/30 uppercase tracking-tighter">Signal Convergence</span>
                       <span className={`font-black ${lastAgentDecision.technical.signal === 'NONE' ? 'text-white/20' : 'text-citron'}`}>
                         {(lastAgentDecision.technical.signal_strength * 100).toFixed(0)}%
                       </span>
                    </div>
                    {lastAgentDecision.technical.convergence_explanation && (
                      <div className="text-[8px] text-white/50 leading-relaxed italic border-l-2 border-citron/20 pl-2 bg-white/[0.02] py-1">
                        "{lastAgentDecision.technical.convergence_explanation}"
                      </div>
                    )}
                    <div className="flex justify-between items-center text-[9px]">
                       <span className="text-white/30 uppercase">Routing Plan</span>
                       <span className="text-white font-black">{lastAgentDecision.execution.execution_plan}</span>
                    </div>
                    <div className="text-[8px] text-white/40 font-mono tracking-tighter">
                      Reason: {lastAgentDecision.execution.routing_reason}
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden mt-2">
                       <div className="h-full bg-citron" style={{ width: `${Math.min(100, lastAgentDecision.alpha.alpha_score * 100)}%` }}></div>
                    </div>
                  </div>
                )}
             </div>
           ) : (
             <div className="py-6 flex flex-col items-center justify-center gap-2 opacity-20">
                <Activity size={24} className="text-citron" />
                <span className="text-[9px] font-black uppercase tracking-widest text-center">Awaiting Autonomous <br/> Sequence Start</span>
             </div>
           )}
        </div>
      </GlassCard>

      {/* 2. MANUAL OVERRIDE */}
      <GlassCard title="Manual Override" className="shrink-0 border-white/5 opacity-50 hover:opacity-100 transition-opacity">
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Ticker Target</span>
              <span className="text-lg font-black text-white">{currentSymbol?.ticker || '---'}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Live Price</span>
              <div className="text-lg font-mono font-black text-citron citron-glow">
                ${currentSymbol?.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 bg-white/5 p-3 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-black text-white/40 uppercase tracking-widest">Order Price</label>
              <button 
                onClick={resetToMarket}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase transition-all ${!isManualPrice ? 'bg-citron text-black' : 'text-white/20 hover:text-citron'}`}
              >
                {isManualPrice ? <RefreshCw size={8} /> : null}
                {isManualPrice ? 'Market Sync' : 'Market Price'}
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 font-black text-sm">$</span>
              <input 
                type="number"
                value={orderPrice}
                onChange={handlePriceChange}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-sm font-black font-mono focus:border-citron outline-none transition-all text-white"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleExecute('BUY')}
              className="flex flex-col items-center justify-center gap-1 py-2 bg-citron text-black rounded-2xl font-black uppercase tracking-tighter active:scale-95 transition-all shadow-[0_10px_25px_rgba(223,255,0,0.1)]"
            >
              <ArrowUpRight size={18} />
              <span className="text-[11px]">BUY</span>
            </button>
            <button 
              onClick={() => handleExecute('SELL')}
              className="flex flex-col items-center justify-center gap-1 py-2 bg-tv-red/20 text-white rounded-2xl font-black uppercase tracking-tighter active:scale-95 transition-all shadow-[0_10px_25px_rgba(242,54,69,0.1)] border border-citron/20"
            >
              <ArrowDownLeft size={18} />
              <span className="text-[11px]">SELL</span>
            </button>
          </div>
        </div>
      </GlassCard>

      {/* 3. AUTONOMOUS ENGINE */}
      <GlassCard title="Autonomous Engine" className="shrink-0 border-l-4 border-l-citron">
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-citron/30 group-hover:bg-citron transition-all"></div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] text-white/40 uppercase flex items-center gap-2">
                <TrendingUp size={10} className="text-citron" /> P&L Tracking
              </div>
              {isTradeInProgress && (
                <div className="flex items-center gap-1 animate-pulse">
                  <div className="w-1 h-1 rounded-full bg-tv-green shadow-[0_0_5px_#089981]"></div>
                  <span className="text-[8px] font-black text-tv-green uppercase">Live</span>
                </div>
              )}
            </div>
            <div className={`text-xl font-black font-mono ${botPnl >= 0 ? 'text-citron' : 'text-tv-red'} ${isTradeInProgress ? 'animate-pulse' : ''}`}>
              {botPnl >= 0 ? '+' : '-'}${Math.abs(botPnl).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 relative overflow-hidden group">
             <div className="absolute top-0 left-0 w-1 h-full bg-tv-accent/30 group-hover:bg-tv-accent transition-all"></div>
             <div className="text-[10px] text-white/40 uppercase mb-1 flex items-center gap-2">
              <Wallet size={10} className="text-tv-accent" /> Total Value
            </div>
            <div className="text-xl font-black text-white font-mono">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] bg-black/40 p-2 rounded-lg border border-white/5">
            <span className="text-white/40 uppercase font-bold tracking-widest">Engine Status</span>
            <span className={`font-black uppercase tracking-tighter flex items-center gap-2 ${isBotActive ? 'text-citron' : 'text-white/20'}`}>
               <div className={`w-1.5 h-1.5 rounded-full ${isBotActive ? 'bg-citron animate-pulse shadow-[0_0_8px_#DFFF00]' : 'bg-white/10'}`}></div>
              {isBotActive ? 'Neural Auto-Pilot' : 'Manual Hibernation'}
            </span>
          </div>
        </div>
      </GlassCard>

      {/* 4. NEURAL EXECUTION AUDIT */}
      <GlassCard title="Neural Execution Audit" className="shrink-0 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">Transaction Logs ({botLogs.length})</span>
          {isBotActive && <div className="text-[8px] text-citron animate-pulse font-mono uppercase">Orchestrating...</div>}
        </div>
        
        <div className="mt-1 bg-black/40 rounded-xl border border-white/5 overflow-y-auto custom-scrollbar p-1 max-h-[250px] font-mono text-[10px] leading-relaxed transition-all">
          {botLogs.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center opacity-20 uppercase tracking-widest text-[8px] gap-2">
              <Database size={24} className="text-citron/50" />
              Neutral Grid - Awaiting Node
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {botLogs.map((log) => {
                const isExecuted = log.status === 'EXECUTED';
                return (
                  <div key={log.id} className={`group relative flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isExecuted ? 'bg-citron/[0.05] border-citron/40 shadow-[inset_0_0_10px_rgba(223,255,0,0.05)]' : 'bg-white/[0.02] border-white/5 border-dashed'
                  }`}>
                    <div className="flex items-start gap-3 flex-1 min-w-0 pr-2">
                      <div className={`w-1 h-8 rounded-full shrink-0 ${
                        log.type === 'BUY' ? 'bg-citron' : 
                        log.type === 'SELL' ? 'bg-tv-red' : 'bg-white/20'
                      }`}></div>
                      
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-black tracking-tighter whitespace-nowrap ${
                              log.type === 'BUY' ? 'text-citron' : 
                              log.type === 'SELL' ? 'text-tv-red' : 'text-white/50'
                            }`}>
                              {log.type} {log.ticker}
                            </span>
                            <span className="text-[7px] px-1 py-0.5 rounded bg-white/5 text-white/40 font-black tracking-widest uppercase">
                              {log.origin}
                            </span>
                          </div>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-1 ${
                            isExecuted ? 'bg-citron text-black' : 'bg-white/10 text-white/40'
                          }`}>
                            {isExecuted ? <CheckCircle2 size={10}/> : <Clock size={10} className="animate-spin duration-[3000ms]"/>}
                            {isExecuted ? 'FILLED' : 'PENDING'}
                          </span>
                        </div>
                        
                        <div className="flex items-baseline justify-between mt-1">
                           <span className="text-white/40 text-[8px] truncate italic max-w-[120px]">{log.message}</span>
                           <span className="text-white font-black font-mono text-[9px] ml-auto">@ ${log.targetPrice?.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </GlassCard>

      {/* 5. AUTONOMOUS SETUP */}
      <GlassCard title="Autonomous Setup" className="shrink-0 mb-4">
        <div className="flex flex-col gap-4 mt-2">
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-white/50 px-1">
              <span>Risk Leverage (Dynamic)</span>
              <span className="text-citron font-bold">{leverage}x</span>
            </div>
            <input 
              type="range" min="1" max="100" value={leverage} onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-citron"
            />
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => isBotActive && onToggleBot()}
              disabled={!isBotActive}
              className={`flex-1 py-4 border rounded-xl text-[10px] font-black tracking-widest transition-all ${
                isBotActive 
                ? 'bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-600/20' 
                : 'bg-white/5 text-white/10 border-white/5 cursor-not-allowed'
              }`}
            >
              STOP ENGINE
            </button>
            <button 
              onClick={() => !isBotActive && onToggleBot()}
              disabled={isBotActive}
              className={`flex-[2] py-4 rounded-xl text-[10px] font-black tracking-widest transition-all ${
                !isBotActive 
                ? 'bg-citron text-black shadow-[0_0_20px_rgba(223,255,0,0.3)] hover:scale-[1.02] active:scale-95' 
                : 'bg-white/10 text-white/20 border border-white/5 cursor-not-allowed'
              }`}
            >
              {isBotActive ? 'LAUNCHED' : 'LAUNCH AUTO-PILOT'}
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
