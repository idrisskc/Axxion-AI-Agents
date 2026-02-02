import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, User, Loader2, Mic, MicOff, Bot as BotIcon, Terminal, Zap, Activity, Radio, ChevronRight } from 'lucide-react';
import { GoogleGenAI, Type, Modality, LiveServerMessage, FunctionDeclaration } from '@google/genai';
import { Interval } from '../types';

interface Message {
  role: 'user' | 'bot';
  text: string;
}

interface ChatBotProps {
  onSymbolChange: (ticker: string, type: 'stock' | 'crypto' | 'forex' | 'etf') => void;
  onIndicatorAction: (action: 'add' | 'remove' | 'hide' | 'show', type: string, period?: number, color?: string) => void;
  onAddComparison: (ticker: string, type: 'stock' | 'crypto' | 'forex' | 'etf') => void;
  onComparisonAction: (action: 'remove' | 'hide' | 'show', ticker: string) => void;
  onToggleWallet: (open: boolean) => void;
  onIntervalChange: (interval: Interval) => void;
  onToggleBot: (active: boolean) => void;
  currentHistory: any[];
  onTradeExecute?: (side: 'BUY' | 'SELL', price?: number) => void;
}

const toolDeclarations: FunctionDeclaration[] = [
  { 
    name: 'set_main_symbol', 
    parameters: { 
      type: Type.OBJECT, 
      description: 'Définit l actif principal sur le graphique.',
      properties: { 
        ticker: { type: Type.STRING }, 
        type: { type: Type.STRING, enum: ['stock', 'crypto', 'forex', 'etf'] } 
      }, 
      required: ['ticker', 'type'] 
    } 
  },
  {
    name: 'set_time_frame',
    parameters: {
      type: Type.OBJECT,
      description: 'Change l intervalle de temps du graphique.',
      properties: {
        interval: { type: Type.STRING, enum: ['1m', '5m', '15m', '1H', '4H', '1D', '1W', '1M', '1Y'] }
      },
      required: ['interval']
    }
  },
  { 
    name: 'execute_trade', 
    parameters: { 
      type: Type.OBJECT, 
      description: 'Exécute un ordre d achat ou de vente.',
      properties: { 
        side: { type: Type.STRING, enum: ['BUY', 'SELL'] },
        price: { type: Type.NUMBER }
      }, 
      required: ['side'] 
    } 
  },
  { 
    name: 'toggle_auto_pilot', 
    parameters: { 
      type: Type.OBJECT, 
      description: 'Active ou désactive le moteur de trading automatique (Auto-Pilot).',
      properties: { 
        active: { type: Type.BOOLEAN, description: 'True pour démarrer, False pour arrêter.' } 
      }, 
      required: ['active'] 
    } 
  },
  { 
    name: 'add_comparison', 
    parameters: { 
      type: Type.OBJECT, 
      description: 'Ajoute un nouveau symbole en superposition pour comparaison.',
      properties: { 
        ticker: { type: Type.STRING, description: 'Symbole (ex: ETHUSDT, AAPL).' }, 
        type: { type: Type.STRING, enum: ['stock', 'crypto', 'forex', 'etf'] } 
      }, 
      required: ['ticker', 'type'] 
    } 
  },
  { 
    name: 'manage_comparison', 
    parameters: { 
      type: Type.OBJECT, 
      description: 'Gère une comparaison existante (supprimer, cacher, montrer).',
      properties: { 
        action: { type: Type.STRING, enum: ['remove', 'hide', 'show'] }, 
        ticker: { type: Type.STRING, description: 'Le symbole à manipuler.' } 
      }, 
      required: ['action', 'ticker'] 
    } 
  },
  { 
    name: 'manage_indicator', 
    parameters: { 
      type: Type.OBJECT, 
      description: 'Contrôle les indicateurs techniques (Moyennes, RSI, Volume, etc).',
      properties: { 
        action: { type: Type.STRING, enum: ['add', 'remove', 'hide', 'show'] }, 
        type: { type: Type.STRING, description: 'Type d indicateur (ex: SMA, EMA, RSI, VOL).' }, 
        period: { type: Type.NUMBER }, 
        color: { type: Type.STRING } 
      }, 
      required: ['action', 'type'] 
    } 
  },
  { 
    name: 'toggle_wallet', 
    parameters: { 
      type: Type.OBJECT, 
      description: 'Ouvre ou ferme le portefeuille.',
      properties: { open: { type: Type.BOOLEAN } }, 
      required: ['open'] 
    } 
  }
];

const SYSTEM_INSTRUCTION = `Tu es le Nexus Operator, l'interface neuronale de contrôle tactique de AXION AI.

RÈGLES DE GESTION DES INDICATEURS (Volume inclus) :
- "Mets le volume", "Affiche le volume", "Ajoute VOL" -> manage_indicator(action='add', type='VOL').
- "Enlève le volume", "Supprime volume", "Retire VOL" -> manage_indicator(action='remove', type='VOL').
- "Cache le volume", "Masque le volume" -> manage_indicator(action='hide', type='VOL').
- "Réaffiche le volume", "Montre volume" -> manage_indicator(action='show', type='VOL').

Tu parles comme un officier de mission control : précis, efficace, utilisant un jargon technique (ex: "Flux de données synchronisé", "Calque de volume activé"). Réponds toujours dans la langue de l'utilisateur.`;

function decode(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const ChatBot: React.FC<ChatBotProps> = ({ 
  onSymbolChange, onIndicatorAction, onAddComparison, onComparisonAction, onToggleWallet, onIntervalChange, onToggleBot, onTradeExecute 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: "Opérateur AXION prêt. Canal de commande synchronisé." }
  ]);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentInputText, setCurrentInputText] = useState('');
  const [currentOutputText, setCurrentOutputText] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<any>(null);
  const audioContexts = useRef<{ input?: AudioContext; output?: AudioContext }>({});
  const nextStartTime = useRef(0);
  const audioSources = useRef<Set<AudioBufferSourceNode>>(new Set());
  const latestInputText = useRef('');
  const latestOutputText = useRef('');

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen, currentOutputText, currentInputText]);

  const getToolConfirmation = (name: string, args: any): string => {
    switch (name) {
      case 'set_main_symbol': return `Synchronisation du flux neuronal avec les serveurs de ${args.ticker}...`;
      case 'set_time_frame': return `Recalibration de la résolution temporelle vers l'intervalle ${args.interval}...`;
      case 'execute_trade': return `Autorisation de séquence de ${args.side} pour ${args.ticker} en cours de transmission...`;
      case 'toggle_auto_pilot': return `${args.active ? 'Lancement' : 'Hibernation'} du moteur d'orchestration autonome...`;
      case 'manage_indicator': 
        if (args.type.toUpperCase() === 'VOL') {
          return `Gestion du flux d'activité (Volume) : ${args.action.toUpperCase()} initié...`;
        }
        return `Déploiement du module analytique ${args.type} dans le tampon graphique...`;
      default: return `Commande reçue par l'opérateur. Exécution des modules système...`;
    }
  };

  const executeFunction = useCallback((name: string, args: any) => {
    const confirmation = getToolConfirmation(name, args);
    setMessages(prev => [...prev, { role: 'bot', text: `[SYSTEM] ${confirmation}` }]);

    try {
      if (name === 'add_comparison') {
        onAddComparison(args.ticker.toUpperCase(), args.type || 'crypto');
        return "COMPARISON_ADDED";
      }
      if (name === 'manage_comparison') {
        onComparisonAction(args.action, args.ticker.toUpperCase());
        return `COMPARISON_${args.action.toUpperCase()}`;
      }
      if (name === 'toggle_auto_pilot') {
        onToggleBot(args.active);
        return `ENGINE_${args.active ? 'STARTED' : 'STOPPED'}`;
      }
      if (name === 'set_main_symbol') onSymbolChange(args.ticker.toUpperCase(), args.type);
      if (name === 'set_time_frame') onIntervalChange(args.interval as Interval);
      if (name === 'execute_trade') onTradeExecute?.(args.side, args.price);
      if (name === 'manage_indicator') onIndicatorAction(args.action, args.type.toUpperCase(), args.period, args.color);
      if (name === 'toggle_wallet') onToggleWallet(args.open);
      return "SUCCESS";
    } catch (e) { return "ERROR"; }
  }, [onSymbolChange, onIndicatorAction, onAddComparison, onComparisonAction, onToggleWallet, onIntervalChange, onToggleBot, onTradeExecute]);

  const stopAllAudio = () => {
    for (const source of audioSources.current) {
      try { source.stop(); } catch(e) {}
    }
    audioSources.current.clear();
    nextStartTime.current = 0;
  };

  const toggleLiveSession = async () => {
    // Si la session est déjà active, on l'arrête sans demander de permissions
    if (isLive) {
      sessionRef.current?.close();
      setIsLive(false);
      stopAllAudio();
      return;
    }

    // Le Microphone n'est demandé QU'ICI, après l'interaction utilisateur (clic bouton)
    try {
      setIsLoading(true);
      
      // Initialisation de l'AudioContext UNIQUEMENT au moment du clic
      if (!audioContexts.current.input) audioContexts.current.input = new AudioContext({ sampleRate: 16000 });
      if (!audioContexts.current.output) audioContexts.current.output = new AudioContext({ sampleRate: 24000 });
      
      // Reprendre l'AudioContext si suspendu (nécessaire pour Chrome/Safari)
      await audioContexts.current.input.resume();
      await audioContexts.current.output.resume();

      // DEMANDE D'AUTORISATION MICROPHONE - Se déclenche uniquement maintenant
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: toolDeclarations }]
        },
        callbacks: {
          onopen: () => {
            setIsLive(true);
            setIsLoading(false);
            const source = audioContexts.current.input!.createMediaStreamSource(stream);
            const processor = audioContexts.current.input!.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              const base64 = encode(new Uint8Array(int16.buffer));
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(processor);
            processor.connect(audioContexts.current.input!.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContexts.current.output) {
              const ctx = audioContexts.current.output;
              nextStartTime.current = Math.max(nextStartTime.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.onended = () => audioSources.current.delete(source);
              source.start(nextStartTime.current);
              nextStartTime.current += buffer.duration;
              audioSources.current.add(source);
            }
            if (msg.serverContent?.interrupted) stopAllAudio();
            if (msg.serverContent?.inputTranscription) {
              const t = msg.serverContent.inputTranscription.text;
              setCurrentInputText(p => p + t);
              latestInputText.current += t;
            }
            if (msg.serverContent?.outputTranscription) {
              const t = msg.serverContent.outputTranscription.text;
              setCurrentOutputText(p => p + t);
              latestOutputText.current += t;
            }
            if (msg.serverContent?.turnComplete) {
              setMessages(p => [...p, { role: 'user', text: latestInputText.current.trim() || "..." }, { role: 'bot', text: latestOutputText.current.trim() || "..." }]);
              setCurrentInputText(''); setCurrentOutputText('');
              latestInputText.current = ''; latestOutputText.current = '';
            }
            if (msg.toolCall) {
              for (const fc of msg.toolCall.functionCalls) {
                const result = executeFunction(fc.name, fc.args);
                sessionPromise.then(s => s.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result } } }));
              }
            }
          },
          onclose: () => setIsLive(false),
          onerror: () => {
            setIsLive(false);
            setIsLoading(false);
          }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e) { 
      console.error("Microphone access denied or error:", e);
      setIsLoading(false); 
      setMessages(p => [...p, { role: 'bot', text: "[SYSTEM] Accès microphone refusé ou non disponible." }]);
    }
  };

  const handleSendText = async () => {
    if (!input.trim() || isLoading) return;
    const text = input; setInput(''); setIsLoading(true);
    setMessages(p => [...p, { role: 'user', text }, { role: 'bot', text: '' }]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: text,
        config: { systemInstruction: SYSTEM_INSTRUCTION, tools: [{ functionDeclarations: toolDeclarations }] }
      });
      let full = '';
      for await (const chunk of stream) {
        if (chunk.text) {
          full += chunk.text;
          setMessages(p => { const n = [...p]; n[n.length-1] = { role: 'bot', text: full }; return n; });
        }
        if (chunk.functionCalls) {
          for (const fc of chunk.functionCalls) executeFunction(fc.name, fc.args);
        }
      }
    } catch (e) {
      setMessages(p => [...p.slice(0, -1), { role: 'bot', text: "Liaison satellite interrompue." }]);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="fixed bottom-12 left-6 z-[100] flex flex-col items-start">
      {isOpen && (
        <div className="mb-4 w-72 sm:w-[360px] h-[480px] bg-black/80 backdrop-blur-3xl rounded-[32px] flex flex-col shadow-2xl border border-citron/20 animate-in slide-in-from-bottom-10 duration-300 overflow-hidden">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${isLive ? 'bg-citron border-citron shadow-[0_0_20px_#DFFF00]' : 'bg-white/5 border-white/10 text-citron'}`}>
                {isLive ? <Radio size={18} className="text-black animate-pulse" /> : <BotIcon size={18} />}
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Operator Comm</h4>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1 h-1 rounded-full ${isLive ? 'bg-citron animate-ping' : 'bg-white/10'}`}></div>
                  <span className="text-[8px] font-bold text-white/30 uppercase">{isLive ? 'Link Active' : 'Standby'}</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-white/30"><X size={16} /></button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-[10px] font-mono border ${msg.role === 'bot' ? 'bg-white/5 text-white/70 border-white/5' : 'bg-citron text-black font-black border-citron'}`}>
                  {msg.text || (isLoading && <Loader2 size={10} className="animate-spin" />)}
                </div>
              </div>
            ))}
            {(currentInputText || currentOutputText) && (
              <div className="p-2 bg-citron/5 rounded-xl border border-citron/10 space-y-1">
                {currentInputText && <p className="text-[8px] text-citron/60 italic font-mono flex items-center gap-1"><ChevronRight size={8}/> {currentInputText}</p>}
                {currentOutputText && <p className="text-[8px] text-white/40 font-mono flex items-center gap-1"><Bot size={8}/> {currentOutputText}</p>}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-white/5 bg-black/40">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  value={input} 
                  onChange={(e) => setInput(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                  placeholder="Vocal ou texte..." 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-[10px] text-white outline-none focus:border-citron/50 transition-all"
                />
                <button 
                  onClick={toggleLiveSession} 
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${isLive ? 'text-tv-red bg-tv-red/10 animate-pulse' : 'text-white/30 hover:text-citron'}`}
                  title="Voice Command"
                >
                  {isLive ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
              </div>
              <button 
                onClick={handleSendText}
                disabled={!input.trim() || isLoading}
                className={`p-3 rounded-xl flex items-center justify-center transition-all shadow-[0_0_15px_rgba(223,255,0,0.2)] ${
                  !input.trim() || isLoading 
                  ? 'bg-white/5 text-white/10 cursor-not-allowed border border-white/5' 
                  : 'bg-citron text-black hover:scale-105 active:scale-95 border border-citron'
                }`}
                title="Send Message"
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all animate-jump ${isLive ? 'bg-citron shadow-[0_0_30px_#DFFF00]' : 'bg-citron shadow-xl hover:scale-110 active:scale-90'}`}>
          <Zap size={24} className="text-black" />
        </button>
      )}
    </div>
  );
};