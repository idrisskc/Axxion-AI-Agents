
import * as React from 'react';
import { X, Trash2, Eye, EyeOff, BarChart2, Info, Activity } from 'lucide-react';
import { Indicator, IndicatorType } from '../types';

const { useState, useEffect } = React;

interface IndicatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeIndicators: Indicator[];
  onAddIndicator: (indicator: Indicator) => void;
  onUpdateIndicator: (indicator: Indicator) => void;
  onRemoveIndicator: (id: string) => void;
}

const INDICATOR_DEFINITIONS: Record<IndicatorType, { name: string, description: string }> = {
  SMA: { name: 'Simple Moving Average', description: 'Average price over a specific number of periods.' },
  EMA: { name: 'Exponential Moving Average', description: 'Reacts faster to recent price trends.' },
  WMA: { name: 'Weighted Moving Average', description: 'Recent data points have more weight.' },
  BB: { name: 'Bollinger Bands', description: 'Volatility bands around an SMA.' },
  RSI: { name: 'Relative Strength Index', description: 'Momentum oscillator for overbought/oversold.' },
  MACD: { name: 'MACD', description: 'Relationship between two EMAs.' },
  STOCH: { name: 'Stochastic Oscillator', description: 'Compares closing price to range.' },
  VOL: { name: 'Volume', description: 'Total trading activity histogram.' },
  VWAP: { name: 'VWAP', description: 'Volume Weighted Average Price.' },
  ATR: { name: 'ATR', description: 'Average True Range (Volatility).' },
  ADX: { name: 'ADX', description: 'Measures trend strength.' },
  MFI: { name: 'MFI', description: 'Money Flow Index (Price + Volume).' },
  SUPERTREND: { name: 'SuperTrend', description: 'Volatility-based buy/sell signal.' },
  ICHIMOKU: { name: 'Ichimoku Cloud', description: 'Trend, momentum, and support/resistance.' },
  KELTNER: { name: 'Keltner Channels', description: 'Volatility-based envelopes.' },
  OBV: { name: 'OBV', description: 'Cumulative volume flow.' }
};

export const IndicatorsModal: React.FC<IndicatorsModalProps> = ({ 
  isOpen, onClose, activeIndicators, onAddIndicator, onUpdateIndicator, onRemoveIndicator 
}) => {
  const [selectedType, setSelectedType] = useState<IndicatorType>('SMA');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [params, setParams] = useState<Partial<Indicator>>({
    period: 14,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    stdDev: 2,
    color: '#DFFF00',
    lineWidth: 2,
    lineStyle: 'solid'
  });

  useEffect(() => {
    if (!editingId) {
      setParams(prev => ({
        ...prev,
        period: selectedType === 'BB' ? 20 : (selectedType === 'MACD' ? 26 : 14),
        color: selectedType === 'SMA' ? '#DFFF00' : (selectedType === 'EMA' ? '#00E5FF' : '#FF4081')
      }));
    }
  }, [selectedType, editingId]);

  if (!isOpen) return null;

  const handleSave = () => {
    const newIndicator: Indicator = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      type: selectedType,
      period: params.period || 14,
      fastPeriod: params.fastPeriod,
      slowPeriod: params.slowPeriod,
      signalPeriod: params.signalPeriod,
      stdDev: params.stdDev,
      color: params.color || '#DFFF00',
      lineWidth: params.lineWidth || 2,
      lineStyle: (params.lineStyle as any) || 'solid',
      visible: true
    };

    if (editingId) {
      onUpdateIndicator(newIndicator);
      setEditingId(null);
    } else {
      onAddIndicator(newIndicator);
    }
  };

  const startEditing = (i: Indicator) => {
    setEditingId(i.id);
    setSelectedType(i.type);
    setParams({ ...i });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/30 z-[100] flex items-center justify-center backdrop-blur-[2px] p-4 transition-all duration-300 animate-in fade-in" 
      onClick={onClose}
    >
      <div 
        className="bg-[#050505]/60 backdrop-blur-2xl w-full max-w-4xl h-full max-h-[550px] rounded-[32px] border border-white/10 flex overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200" 
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar - Layers */}
        <div className="w-56 border-r border-white/5 bg-white/[0.02] flex flex-col shrink-0">
          <div className="p-6 border-b border-white/5 shrink-0">
            <h3 className="text-[10px] font-black text-citron uppercase tracking-[0.3em] flex items-center gap-2">
              <Activity size={14} /> ACTIVE LAYERS
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar min-h-0">
            {activeIndicators.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-20">
                <BarChart2 size={32} className="mb-2" />
                <p className="text-[8px] font-black uppercase tracking-[0.4em]">Standby</p>
              </div>
            ) : (
              activeIndicators.map(i => (
                <div 
                  key={i.id} 
                  className={`group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer border ${
                    editingId === i.id 
                    ? 'bg-citron/10 border-citron/30' 
                    : 'bg-white/[0.03] border-transparent hover:bg-white/10 hover:border-white/5'
                  }`}
                  onClick={() => startEditing(i)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: i.color }}></div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white truncate uppercase">{i.type}</span>
                      <span className="text-[8px] font-bold text-white/30">PERIOD: {i.period}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onUpdateIndicator({...i, visible: !i.visible}); }}
                      className="p-1.5 hover:bg-white/10 rounded-full text-white/40 hover:text-citron transition-colors"
                    >
                      {i.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRemoveIndicator(i.id); }}
                      className="p-1.5 hover:bg-white/10 rounded-full text-white/40 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Configuration Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-6 flex justify-between items-center border-b border-white/5 shrink-0 bg-white/[0.01]">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                {editingId ? 'Configure' : 'Deploy'} <span className="text-citron">Signal</span>
              </h2>
              <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.3em] mt-0.5">Neural Analytics Node v.3.4</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all text-white/30 hover:text-white">
              <X size={20}/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar min-h-0 bg-black/5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[9px] text-citron font-black uppercase tracking-[0.4em] ml-1">Analytical Modules</label>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(INDICATOR_DEFINITIONS) as IndicatorType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => { setSelectedType(t); setEditingId(null); }}
                      className={`px-2 py-2 rounded-xl text-[10px] font-black border transition-all ${
                        selectedType === t 
                        ? 'bg-citron border-citron text-black shadow-[0_0_15px_rgba(223,255,0,0.2)]' 
                        : 'bg-white/5 border-white/5 text-white/40 hover:text-white hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="bg-citron/5 p-4 rounded-2xl border border-citron/10 flex gap-3 mt-4">
                  <Info className="text-citron shrink-0 mt-0.5" size={14} />
                  <p className="text-[10px] text-white/60 leading-relaxed font-medium italic">
                    {INDICATOR_DEFINITIONS[selectedType].description}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[9px] text-citron font-black uppercase tracking-[0.4em] ml-1">Parameters & Styling</label>
                <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/5 space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-[9px] font-black text-white/40 uppercase tracking-widest">
                      <span>Length / Period</span>
                      <span className="text-citron font-mono text-xs">{params.period}</span>
                    </div>
                    <input 
                      type="range" min="2" max="200" value={params.period} 
                      onChange={e => setParams({...params, period: parseInt(e.target.value)})}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-citron"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl border border-white/10 overflow-hidden relative shadow-inner">
                        <input 
                          type="color" 
                          value={params.color} 
                          onChange={e => setParams({...params, color: e.target.value})} 
                          className="absolute inset-[-8px] cursor-pointer w-[150%] h-[150%]" 
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-white/40 uppercase">{params.color}</span>
                    </div>
                    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                      <button 
                        onClick={() => setParams({...params, lineStyle: 'solid'})}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${params.lineStyle === 'solid' ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'}`}
                      >
                        SOLID
                      </button>
                      <button 
                        onClick={() => setParams({...params, lineStyle: 'dashed'})}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${params.lineStyle === 'dashed' ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white/40'}`}
                      >
                        DASHED
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-white/5 bg-black/20 backdrop-blur-md flex gap-4 shrink-0">
             <button 
               onClick={onClose} 
               className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:bg-white/10 hover:text-white transition-all"
             >
               Discard
             </button>
             <button 
               onClick={handleSave} 
               className="flex-[2] py-4 bg-citron text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-[0_0_25px_rgba(223,255,0,0.3)] transition-all hover:scale-[1.02] active:scale-95"
             >
               {editingId ? 'SAVE CHANGES' : 'DEPLOY TO MAIN CHART'}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorsModal;
