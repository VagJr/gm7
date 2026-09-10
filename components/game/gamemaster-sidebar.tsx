'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MessageSquare,
  Users,
  Sun,
  Dices,
  Send,
  ChevronRight,
  Flame,
  Volume2,
  X,
  Swords,
  Sparkles,
  Heart,
  Search
} from 'lucide-react';
import type { Character, Enemy, Log } from '@/lib/game-engine';

interface GamemasterSidebarProps {
  combat: boolean;
  round: number;
  isHeroTurn: boolean;
  activeHero: Character | null;
  currentEnemy: Enemy | null;
  onAttack?: () => void;
  onCastSpell?: () => void;
  onUsePotion?: () => void;
  onEndTurn?: () => void;
  onNarrateMessage: (msg: string) => void;
  onRollDice: (formula: string) => void;
  lastRollResult?: { formula: string; total: number; detail: string } | null;
  logs: Log[];
  aiChoices?: string[];
  busy?: boolean;
  onClose?: () => void;
}

export function GamemasterSidebar({
  combat,
  round,
  isHeroTurn,
  activeHero,
  currentEnemy,
  onAttack,
  onCastSpell,
  onUsePotion,
  onEndTurn,
  onNarrateMessage,
  onRollDice,
  lastRollResult,
  logs,
  aiChoices = [
    'Examinar os degraus e a névoa arcaica',
    'Tocar no sino de bronze rúnico',
    'Conversar com os aldeões da vila'
  ],
  busy,
  onClose
}: GamemasterSidebarProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [diceFormula, setDiceFormula] = useState(lastRollResult?.formula || '1d20+3');
  const [displayedRoll, setDisplayedRoll] = useState(lastRollResult?.total || 7);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll narrative stream to bottom when logs update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Sync if new roll arrives
  useEffect(() => {
    if (lastRollResult) {
      setDiceFormula(lastRollResult.formula);
      setDisplayedRoll(lastRollResult.total);
    }
  }, [lastRollResult]);

  const handleQuickRoll = (dice: string) => {
    const f = `1${dice}`;
    setDiceFormula(f);
    onRollDice(f);
  };

  // Direct action execution + narrative dispatch
  const handleExecuteChoice = (choiceText: string) => {
    const lower = choiceText.toLowerCase();

    // 1. Check for combat attack intent
    if (combat && (lower.includes('ataca') || lower.includes('golpe') || lower.includes('investida') || lower.includes('espada') || lower.includes('arco'))) {
      if (onAttack) onAttack();
    }
    // 2. Check for spell casting intent
    else if (combat && (lower.includes('magia') || lower.includes('raio de fogo') || lower.includes('míssil') || lower.includes('conjur'))) {
      if (onCastSpell) onCastSpell();
    }
    // 3. Check for potion/healing intent
    else if (lower.includes('poção') || lower.includes('pocao') || lower.includes('curar') || lower.includes('beber')) {
      if (onUsePotion) onUsePotion();
    }
    // 4. Check for end turn intent
    else if (combat && (lower.includes('passar') || lower.includes('fim do turno') || lower.includes('terminar turno'))) {
      if (onEndTurn) onEndTurn();
    }

    // Always narrate through GM
    onNarrateMessage(choiceText);
  };

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || busy) return;
    const text = customPrompt.trim();
    handleExecuteChoice(text);
    setCustomPrompt('');
  };

  return (
    <aside className="w-80 sm:w-96 md:w-[400px] h-full max-h-full flex flex-col bg-[#0f140f]/95 border-2 border-[#384333]/90 rounded-2xl backdrop-blur-2xl shrink-0 select-none shadow-2xl overflow-hidden pointer-events-auto">
      {/* ═══ MODULE 1: GAMEMASTER LIVE HEADER & AVATAR ═══ */}
      <div className="p-3 pb-2 border-b border-zinc-800/80 flex flex-col gap-2 bg-[#121812]">
        {/* GM Status Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="p-1 rounded bg-zinc-900 text-amber-400">
              <Flame size={14} />
            </span>
            <span className="font-serif font-bold text-amber-200 text-xs">Mestre de Jogo (Groq AI)</span>
          </div>

          {/* "Speaking..." pulsating indicator + Close button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px] font-bold">
              <div className="flex items-center gap-0.5 h-3">
                <span className="w-1 bg-amber-400 rounded-full audio-bar-1" />
                <span className="w-1 bg-amber-400 rounded-full audio-bar-2" />
                <span className="w-1 bg-amber-400 rounded-full audio-bar-3" />
              </div>
              <span>{busy ? 'Narrando…' : 'Online'}</span>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 transition-colors"
                title="Fechar gaveta da Mestre"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* GM Portrait Banner */}
        <div className="relative w-full h-20 sm:h-24 rounded-xl overflow-hidden border border-zinc-700/80 bg-gradient-to-b from-stone-950 via-zinc-900 to-black shadow-inner group">
          <img
            src="/gamemaster_skeleton.jpg"
            alt="Gamemaster"
            className="w-full h-full object-cover object-top opacity-85 group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f140f] via-transparent to-transparent" />
          <div className="absolute bottom-1.5 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm border border-amber-600/40 text-[10px] text-amber-200 font-serif">
            <Sparkles size={11} className="text-amber-400" />
            <span>Narrador Oficial D&D 5e</span>
          </div>
        </div>
      </div>

      {/* ═══ MODULE 2: SPACIOUS NARRATIVE CHAT STREAM WITH AUTO-SCROLL ═══ */}
      <div className="flex-1 min-h-[160px] p-3 overflow-y-auto space-y-2.5 bg-[#090d09] border-b border-zinc-800/80">
        <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400/80 block">
          Crônica da Aventura:
        </span>
        {logs.length === 0 ? (
          <p className="text-xs text-zinc-400 italic">A aventura aguarda suas decisões. Diga algo ao Mestre ou realize uma ação no tabuleiro.</p>
        ) : (
          logs.slice(-25).map((log, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-xl text-xs leading-relaxed transition-all shadow-sm ${
                log.kind === 'gm'
                  ? 'bg-[#151c15] border border-amber-900/40 text-amber-100 font-serif'
                  : log.kind === 'roll'
                  ? 'bg-zinc-900/90 border border-zinc-700/80 text-cyan-200 font-mono text-[11px]'
                  : 'bg-zinc-950 border border-zinc-800 text-zinc-200'
              }`}
            >
              <div className="flex items-center justify-between text-[9px] text-zinc-500 font-mono mb-1">
                <span className="uppercase font-bold tracking-wider text-amber-400/80">
                  {log.kind === 'gm' ? '📜 Mestre' : log.kind === 'roll' ? '🎲 Rolagem' : '👤 Jogador'}
                </span>
                <span>{new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="whitespace-pre-wrap">{log.text}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ═══ MODULE 3: FULL-SENTENCE READABLE QUICK CHOICES (WITH DIRECT BOARD EXECUTION) ═══ */}
      <div className="p-2.5 bg-[#0e140e] border-b border-zinc-800/80 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
            <Sparkles size={11} />
            <span>Opções Sugeridas (Disparam Ações):</span>
          </span>
          <span className="text-[9px] text-zinc-500 font-mono">1-Clique</span>
        </div>

        <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
          {/* Quick Combat Shortcuts if in combat */}
          {combat && isHeroTurn && (
            <div className="grid grid-cols-2 gap-1 mb-0.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleExecuteChoice(`Atacar ${currentEnemy ? currentEnemy.name : 'o inimigo'}!`)}
                className="flex items-center gap-1 p-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700/80 text-red-200 text-xs font-bold transition-all shadow"
              >
                <Swords size={12} className="text-red-400 shrink-0" />
                <span>Atacar Alvo</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleExecuteChoice('Beber poção de cura e restaurar pontos de vida.')}
                className="flex items-center gap-1 p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-200 text-xs font-bold transition-all shadow"
              >
                <Heart size={12} className="text-emerald-400 shrink-0" />
                <span>Beber Poção</span>
              </button>
            </div>
          )}

          {/* AI Narrative Context Choices (Full Sentence, Not Truncated) */}
          {aiChoices.map((choice, i) => (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={() => handleExecuteChoice(choice)}
              className="text-left text-xs bg-zinc-900/90 hover:bg-amber-950/40 border border-zinc-700/80 hover:border-amber-500/80 text-zinc-200 hover:text-amber-200 p-2 rounded-xl transition-all flex items-center justify-between group shadow-sm active:scale-98 whitespace-normal break-words leading-relaxed"
            >
              <span className="flex-1">{choice}</span>
              <ChevronRight size={14} className="text-amber-400 shrink-0 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          ))}
        </div>

        {/* Mini Dice Roll Strip */}
        <div className="pt-1 border-t border-zinc-800/60 flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => handleQuickRoll('d20')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-amber-950/40 border border-zinc-700 text-[11px] font-mono font-bold text-amber-300 hover:border-amber-400 transition-colors"
          >
            <Dices size={13} className="text-amber-400" />
            <span>1d20: {displayedRoll}</span>
          </button>
          <div className="flex items-center gap-1">
            {['d4', 'd6', 'd8', 'd10', 'd12'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleQuickRoll(d)}
                className="px-1.5 py-0.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-[10px] font-mono text-zinc-300 transition-colors"
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ MODULE 4: TEXT INPUT TO TALK TO GM / EXECUTE INTENTS ═══ */}
      <div className="p-2.5 border-t border-zinc-800/80 bg-[#0c100c]/95 shrink-0">
        <form onSubmit={handleSendPrompt} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700/80 focus-within:border-amber-400 transition-colors shadow-inner">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Fale com a Mestre (ex: 'Quero atacar a sentinela')..."
            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-500 outline-none border-none py-1"
          />
          <button
            type="submit"
            disabled={busy || !customPrompt.trim()}
            className="p-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-40 text-black font-bold transition-all shadow"
            title="Enviar ação"
          >
            <Send size={13} />
          </button>
        </form>
      </div>
    </aside>
  );
}
