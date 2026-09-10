'use client';

import React from 'react';
import { Scroll, CheckCircle2, Circle, X, MapPin, Award } from 'lucide-react';

export type QuestItem = {
  id: string;
  title: string;
  location: string;
  description: string;
  objectives: { text: string; completed: boolean }[];
  completed?: boolean;
};

interface QuestLogProps {
  onClose: () => void;
  notes: string;
  onSaveNotes: (notes: string) => void;
  isOwner: boolean;
  questProgress?: Record<string, boolean>;
}

export function QuestLog({ onClose, notes, onSaveNotes, isOwner, questProgress }: QuestLogProps) {
  const qp = questProgress || {};
  const quests: QuestItem[] = [
    {
      id: 'campanha-cinzas',
      title: 'O Despertar das Cinzas (Missão Principal)',
      location: 'Vale de Valdoria • Vila do Rio Verde',
      description: 'Os três selos sagrados que guardam a escuridão foram rompidos. Descubra os invasores, purifique o Menir da floresta e erradique Malakor das catacumbas.',
      completed: Boolean(qp.malakor_defeated),
      objectives: [
        { text: 'Falar com o Ancião Doran na praça central da vila', completed: Boolean(qp.doran_talked) },
        { text: 'Equipar Poções de Cura com a Alquimista Elenor', completed: Boolean(qp.elenor_talked) },
        { text: 'Obter autorização de marcha com o Capitão Kaelen', completed: Boolean(qp.kaelen_talked) },
        { text: 'Viajar para a Mata e derrotar as Sentinelas de Cinzas', completed: Boolean(qp.forest_cleared) },
        { text: 'Adentrar a Dungeon (Catacumbas dos Três Selos)', completed: Boolean(qp.dungeon_entered) },
        { text: 'Confrontar e derrotar Malakor, o Conjurador do Vazio', completed: Boolean(qp.malakor_defeated) }
      ]
    },
    {
      id: 'socorro-elenor',
      title: 'A Erva dos Menires (Missão Secundária)',
      location: 'A Floresta dos Sussurros',
      description: 'A Alquimista Elenor precisa de musgo sagrado que só cresce ao redor dos menires antigos para produzir elixires superiores de revigoração.',
      completed: Boolean(qp.forest_cleared),
      objectives: [
        { text: 'Localizar o círculo de pedras sagradas na floresta', completed: Boolean(qp.forest_cleared) },
        { text: 'Coletar 3 ramos de musgo lunar entre as árvores', completed: Boolean(qp.forest_cleared) }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6 animate-fade-in select-none">
      <div className="relative w-full max-w-3xl bg-zinc-950 border-2 border-amber-900/60 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Scroll size={20} className="text-amber-400" />
            <h2 className="text-lg sm:text-xl font-bold text-amber-200 font-serif tracking-wide">
              Diário de Missões & Crônicas
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quests List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-widest text-amber-400/90 font-bold flex items-center gap-1.5">
              <Award size={14} /> Missões Principais
            </h3>

            {quests.map((quest) => (
              <div
                key={quest.id}
                className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-zinc-100 text-sm sm:text-base font-serif">
                      {quest.title}
                    </h4>
                    <span className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5">
                      <MapPin size={11} className="text-amber-400" /> {quest.location}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">{quest.description}</p>

                {/* Objectives */}
                <div className="space-y-1.5 pt-1 border-t border-zinc-800/80">
                  {quest.objectives.map((obj, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      {obj.completed ? (
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                      ) : (
                        <Circle size={15} className="text-zinc-500 shrink-0" />
                      )}
                      <span className={obj.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}>
                        {obj.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Campaign Notes */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
            <h3 className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
              Anotações Livres da Mesa
            </h3>
            <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {notes || 'Nenhuma anotação adicional registrada no momento.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
