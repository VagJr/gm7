'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, User, X, ChevronRight, Sparkles } from 'lucide-react';

export type NpcDialogData = {
  id: string;
  name: string;
  role: string;
  avatarText?: string;
  dialogText: string;
  options: { label: string; actionText: string }[];
};

interface NpcDialogProps {
  npc: NpcDialogData | null;
  onSelectOption: (actionText: string) => void;
  onClose: () => void;
}

export function NpcDialog({ npc, onSelectOption, onClose }: NpcDialogProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!npc) return;

    setDisplayedText('');
    setIsTyping(true);

    let idx = 0;
    const text = npc.dialogText;
    const interval = setInterval(() => {
      idx += 2;
      setDisplayedText(text.slice(0, idx));
      if (idx >= text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 18);

    return () => clearInterval(interval);
  }, [npc]);

  if (!npc) return null;

  const handleSkipTyping = () => {
    if (isTyping) {
      setDisplayedText(npc.dialogText);
      setIsTyping(false);
    }
  };

  return (
    <div
      onClick={handleSkipTyping}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6 animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-zinc-900 border-2 border-amber-900/70 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 transition-colors"
        >
          <X size={18} />
        </button>

        {/* NPC Profile Header */}
        <div className="flex items-center gap-3.5">
          {/* NPC Avatar Portrait */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-700 via-amber-950 to-black border-2 border-amber-400/80 shadow-lg flex items-center justify-center font-serif text-2xl font-black text-amber-200 shrink-0">
            {npc.avatarText || npc.name[0]}
          </div>

          <div className="min-w-0">
            <span className="text-[11px] uppercase tracking-widest text-amber-400/90 font-bold block">
              {npc.role}
            </span>
            <h3 className="text-lg sm:text-xl font-black text-zinc-100 font-serif tracking-wide truncate">
              {npc.name}
            </h3>
          </div>
        </div>

        {/* Dialog Subtitle Box */}
        <div className="bg-black/60 border border-zinc-800 rounded-2xl p-4 min-h-[100px] flex items-start text-zinc-200 text-sm sm:text-base leading-relaxed font-serif">
          <p className="whitespace-pre-wrap">
            {displayedText}
            {isTyping && <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-1" />}
          </p>
        </div>

        {/* Branching Response Options */}
        <div className="flex flex-col gap-2 pt-1">
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
            Sua Resposta:
          </span>

          {npc.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelectOption(opt.actionText);
                onClose();
              }}
              className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 hover:bg-amber-950/40 border border-zinc-800 hover:border-amber-500/60 text-zinc-200 hover:text-amber-200 text-xs sm:text-sm font-medium text-left transition-all group"
            >
              <span>{opt.label}</span>
              <ChevronRight
                size={16}
                className="text-amber-400 group-hover:translate-x-1 transition-transform"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
