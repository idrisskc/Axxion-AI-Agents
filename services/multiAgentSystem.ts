
import { GoogleGenAI, Type } from "@google/genai";
import { CandleData, Indicator, SymbolInfo, InstitutionalDecision } from "../types";
import { 
  calculateADX, 
  calculateATR, 
  calculateRSI, 
  calculateSMA 
} from "./technicalAnalysis";

const DECISION_SCHEMA = {
  type: Type.OBJECT,
  required: ["symbol", "timestamp", "regime", "alpha", "sentiment", "technical", "statistical", "risk", "portfolio", "execution", "decision"],
  properties: {
    symbol: { type: Type.STRING },
    timestamp: { type: Type.STRING },
    regime: {
      type: Type.OBJECT,
      required: ["regime", "confidence"],
      properties: {
        regime: { type: Type.STRING, enum: ["TREND", "RANGE"] },
        confidence: { type: Type.NUMBER }
      }
    },
    alpha: {
      type: Type.OBJECT,
      required: ["trend_strength", "volatility_state", "correlation_risk", "alpha_score"],
      properties: {
        trend_strength: { type: Type.NUMBER },
        volatility_state: { type: Type.STRING, enum: ["CALM", "NORMAL", "STORM"] },
        correlation_risk: { type: Type.NUMBER },
        alpha_score: { type: Type.NUMBER }
      }
    },
    sentiment: {
      type: Type.OBJECT,
      required: ["sentiment_score", "impact_level", "impact_horizon", "systemic_risk_flag"],
      properties: {
        sentiment_score: { type: Type.NUMBER },
        impact_level: { type: Type.STRING, enum: ["LOW", "MEDIUM", "HIGH"] },
        impact_horizon: { type: Type.STRING, enum: ["SHORT", "MEDIUM", "LONG"] },
        systemic_risk_flag: { type: Type.BOOLEAN }
      }
    },
    technical: {
      type: Type.OBJECT,
      required: ["signal", "signal_strength", "trigger_price", "indicators_used", "convergence_explanation"],
      properties: {
        signal: { type: Type.STRING, enum: ["BUY", "SELL", "NONE"] },
        signal_strength: { type: Type.NUMBER },
        trigger_price: { type: Type.NUMBER },
        indicators_used: { type: Type.ARRAY, items: { type: Type.STRING } },
        convergence_explanation: { type: Type.STRING }
      }
    },
    statistical: {
      type: Type.OBJECT,
      required: ["z_score", "volume_confirmation", "statistical_confidence", "validation"],
      properties: {
        z_score: { type: Type.NUMBER },
        volume_confirmation: { type: Type.BOOLEAN },
        statistical_confidence: { type: Type.NUMBER },
        validation: { type: Type.BOOLEAN }
      }
    },
    risk: {
      type: Type.OBJECT,
      required: ["position_size", "stop_loss", "take_profit", "trailing_stop_distance", "is_storm_mode", "var", "approval"],
      properties: {
        position_size: { type: Type.NUMBER },
        stop_loss: { type: Type.NUMBER },
        take_profit: { type: Type.NUMBER },
        trailing_stop_distance: { type: Type.NUMBER },
        is_storm_mode: { type: Type.BOOLEAN },
        var: { type: Type.NUMBER },
        approval: { type: Type.BOOLEAN }
      }
    },
    portfolio: {
      type: Type.OBJECT,
      required: ["kelly_fraction", "correlation_adjustment"],
      properties: {
        kelly_fraction: { type: Type.NUMBER },
        correlation_adjustment: { type: Type.NUMBER }
      }
    },
    execution: {
      type: Type.OBJECT,
      required: ["execution_plan", "order_type", "routing_reason"],
      properties: {
        execution_plan: { type: Type.STRING, enum: ["TWAP", "VWAP"] },
        order_type: { type: Type.STRING, enum: ["MARKET", "LIMIT"] },
        routing_reason: { type: Type.STRING }
      }
    },
    decision: {
      type: Type.OBJECT,
      required: ["final_action", "authorized"],
      properties: {
        final_action: { type: Type.STRING, enum: ["BUY", "SELL", "HOLD", "BLOCK"] },
        authorized: { type: Type.BOOLEAN }
      }
    }
  }
};

export class MultiAgentSupervisor {
  private lastDecision: InstitutionalDecision | null = null;

  async runFullAnalysis(
    symbol: SymbolInfo,
    data: CandleData[],
    indicators: Indicator[],
    walletBalance: number,
    leverage: number = 10,
    isPositionOpen: boolean = false
  ): Promise<InstitutionalDecision> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Local Technical Preparation
    const adx = calculateADX(data, 14);
    const atr = calculateATR(data, 14);
    const rsi = calculateRSI(data, 14);
    const lastPrice = symbol.price;
    const lastAtr = atr[atr.length - 1] || (lastPrice * 0.01);
    const lastRsi = rsi[rsi.length - 1] || 50;
    const lastAdx = adx.adx[adx.adx.length - 1] || 20;
    const regime = lastAdx > 25 ? "TREND" : "RANGE";

    const systemInstruction = `Tu es le Nexus Institutional Multi-Agent Orchestrator. Tu AGIS en tant que SupervisorAgent contrôlant 4 sous-agents spécialisés.

PROTOCOLE DE COMMUNICATION & SÉCURITÉ :
1. ANALYSE ALPHA (AlphaEngineAgent) : Détermine volatility_state. STORM = ATR > 2*Moyenne ou Mouvement > 5% en 1H.
2. SIGNAL TECHNIQUE (TechnicalSignalAgent) : Tu DOIS fournir une 'convergence_explanation' détaillée. Elle doit expliquer comment le RSI (${lastRsi.toFixed(1)}), l'ADX (${lastAdx.toFixed(1)}) et le Price Action convergent vers le signal.
3. ROUTAGE INTELLIGENT (SmartOrderRouterAgent) :
   - VWAP : Uniquement si volatility_state est 'CALM' ou 'NORMAL' ET que l'impact estimé est < 0.1%.
   - TWAP : Obligatoire en 'STORM' ou si le ratio Taille/Volume est élevé. Explique ton choix dans 'routing_reason'.
4. GESTION DES SORTIES (ExitEngineAgent) :
   - Trailing Stop Dynamique :
     - STORM Mode : 0.35 * ATR (Protection agressive).
     - NORMAL + TREND : 2.5 * ATR (Capture de tendance).
     - NORMAL + RANGE : 1.2 * ATR (Sortie de canal).
     - CALM : 1.8 * ATR.

HIÉRARCHIE DES DÉCISIONS :
- Si Technical=BUY mais Sentiment=HIGH_RISK -> Decision=BLOCK.
- Si Volatility=STORM -> Position_Size réduite de 60%, Exécution=TWAP, Trailing_Stop=Tight.
- Une erreur de données ou une liquidité absente doit entraîner un 'BLOCK' immédiat.

RETOURNE UNIQUEMENT LE JSON.`;

    const prompt = `SESSION D'ANALYSE HAUTE VOLATILITÉ - ${symbol.ticker} @ $${lastPrice}.
    ÉTAT POSITION : ${isPositionOpen ? "OPEN (LOOKING FOR OPTIMAL EXIT)" : "CLOSED (SCANNING ENTRY)"}.
    
    DONNÉES DE LIQUIDITÉ :
    - Volume 24h : ${symbol.volume?.toLocaleString() || 'UNKNOWN'}
    - Taille Commande : ${(walletBalance * leverage).toLocaleString()} USDT
    - Ratio de Profondeur : ${((walletBalance * leverage) / (symbol.volume || 1) * 100).toFixed(5)}%
    
    INDICATEURS BRUTS :
    - ATR (14) : ${lastAtr.toFixed(4)}
    - RSI (14) : ${lastRsi.toFixed(2)}
    - ADX (14) : ${lastAdx.toFixed(2)}
    - Variation 24h : ${symbol.changePercent.toFixed(2)}%
    
    Effectue l'orchestration des agents. Assure-toi que 'routing_reason' et 'convergence_explanation' soient argumentés techniquement.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: DECISION_SCHEMA,
          temperature: 0.1 // Stabilité maximale pour des décisions institutionnelles
        }
      });

      const decision: InstitutionalDecision = JSON.parse(response.text);
      this.lastDecision = decision;
      this.saveAuditLog(decision);
      return decision;
    } catch (error) {
      console.error("Critical Orchestrator Failure:", error);
      // Fail-Safe: Protection du capital en cas de crash de l'IA
      return this.generateFallback(symbol, lastPrice, lastAtr);
    }
  }

  private generateFallback(symbol: SymbolInfo, price: number, atr: number): InstitutionalDecision {
    return {
      symbol: symbol.ticker,
      timestamp: new Date().toISOString(),
      regime: { regime: "RANGE", confidence: 0.1 },
      alpha: { trend_strength: 0, volatility_state: "STORM", correlation_risk: 1.0, alpha_score: 0 },
      sentiment: { sentiment_score: 0, impact_level: "HIGH", impact_horizon: "SHORT", systemic_risk_flag: true },
      technical: { signal: "NONE", signal_strength: 0, trigger_price: price, indicators_used: [], convergence_explanation: "FALLBACK: AI Link Interrupted. Risk mitigation active." },
      statistical: { z_score: 0, volume_confirmation: false, statistical_confidence: 0, validation: false },
      risk: { position_size: 0, stop_loss: 0, take_profit: 0, trailing_stop_distance: atr * 0.5, is_storm_mode: true, var: 1.0, approval: false },
      portfolio: { kelly_fraction: 0, correlation_adjustment: 0 },
      execution: { execution_plan: "TWAP", order_type: "MARKET", routing_reason: "Emergency failsafe protocol." },
      decision: { final_action: "BLOCK", authorized: false }
    };
  }

  private saveAuditLog(decision: InstitutionalDecision) {
    const logs = JSON.parse(localStorage.getItem('nexus_audit_logs') || '[]');
    logs.unshift({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      symbol: decision.symbol,
      action: decision.decision.final_action,
      confidence: decision.statistical.statistical_confidence,
      volatility: decision.alpha.volatility_state,
      routing: decision.execution.execution_plan,
      reason: decision.technical.convergence_explanation
    });
    localStorage.setItem('nexus_audit_logs', JSON.stringify(logs.slice(0, 100)));
  }

  getLastDecision() {
    return this.lastDecision;
  }
}
