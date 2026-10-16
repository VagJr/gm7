'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Coffee, Compass, DoorOpen, Home, Map, Menu, MessageSquare, Moon, Package, ScrollText, Settings, Shield, Swords, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { BiomeType } from '@/lib/game-engine';

type Props = {
  location: string; roomName: string; combat: boolean; busy: boolean; hasHero: boolean;
  onMap: () => void; onActions: () => void; onQuests: () => void; onInventory: () => void;
  onParty: () => void; onChat: () => void; onCharacter: () => void; onSettings: () => void;
  onHome: () => void; onRooms: () => void; onLibrary: () => void;
  onRest: (long: boolean) => void; onTravel: (biome: BiomeType) => void;
  onExpedition: () => void; expeditionActive: boolean;
};
const destinations: { biome: BiomeType; name: string; description: string }[] = [
  { biome: 'village', name: 'Vila do Rio Verde', description: 'Refúgio, suprimentos e encontros' },
  { biome: 'forest', name: 'Floresta dos Sussurros', description: 'A rota da ponte e os primeiros selos' },
  { biome: 'ruins', name: 'Ruínas da Abadia', description: 'Nas trilhas do Culto das Cinzas' },
  { biome: 'dungeon', name: 'Catacumbas', description: 'Guardiões, tesouros e segredos' },
  { biome: 'canyon', name: 'Desfiladeiro da Fenda', description: 'A vanguarda dracônica' },
  { biome: 'lair', name: 'Covil de Ignisrax', description: 'O coração da ameaça' },
];
export function GameNavigation(p: Props) {
  const [menu, setMenu] = useState(false);
  const [atlas, setAtlas] = useState(false);
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const run = (fn: () => void) => { setMenu(false); fn(); };
  const utilities = [
    { label: 'Meu personagem', icon: Shield, action: p.onCharacter, hero: true },
    { label: 'Grupo e jogadores', icon: Users, action: p.onParty },
    { label: 'Diário e missões', icon: ScrollText, action: p.onQuests },
    { label: 'Inventário', icon: Package, action: p.onInventory, hero: true },
    { label: 'Conversa e narrativa', icon: MessageSquare, action: p.onChat },
    { label: 'Mapa do mundo', icon: Map, action: () => setAtlas(true) },
    { label: 'Descanso curto', icon: Coffee, action: () => p.onRest(false), rest: true, hero: true },
    { label: 'Descanso longo', icon: Moon, action: () => p.onRest(true), rest: true, hero: true },
    { label: p.expeditionActive ? 'Gerenciar expedição' : 'Expedições', icon: DoorOpen, action: p.onExpedition, hero: true },
    { label: 'Livro de regras', icon: BookOpen, action: p.onLibrary },
    { label: 'Mesa e convite', icon: Users, action: p.onRooms },
    { label: 'Áudio e opções', icon: Settings, action: p.onSettings },
    { label: 'Voltar ao início', icon: Home, action: p.onHome },
  ];
  return <>
    <header className="play-header"><button className="play-home" onClick={p.onHome} aria-label="Voltar ao início"><Swords size={22} /><span>DRAGONS <small>AND DUNGEONS</small></span></button><div className="play-location"><strong>{p.location}</strong><small>{p.roomName}</small></div><span className={`play-connection ${!online ? 'is-offline' : ''}`} role="status">{!online ? 'Sem conexão' : p.busy ? 'Salvando…' : p.combat ? 'Em combate' : 'Exploração'}</span><nav className="desktop-play-nav" aria-label="Navegação de jogo"><button onClick={p.onQuests}><ScrollText size={17} />Missões</button><button onClick={p.onParty}><Users size={17} />Grupo</button><button onClick={p.onChat}><MessageSquare size={17} />Conversa</button><button onClick={() => setAtlas(true)}><Compass size={17} />Viajar</button></nav><button className="play-menu" onClick={() => setMenu(true)} aria-label="Abrir menu do jogo"><Menu size={21} /></button></header>
    {!online && <div className="connection-warning" role="alert">Sem conexão. As ações precisam do servidor; reconecte para continuar com segurança.</div>}
    <nav className="mobile-play-dock" aria-label="Navegação principal"><button onClick={p.onMap}><Map size={20} /><span>Mapa</span></button><button disabled={!p.hasHero} onClick={p.onActions}><Swords size={20} /><span>Ações</span></button><button onClick={p.onQuests}><ScrollText size={20} /><span>Missões</span></button><button disabled={!p.hasHero} onClick={p.onInventory}><Package size={20} /><span>Mochila</span></button><button onClick={() => setMenu(true)}><Menu size={20} /><span>Mais</span></button></nav>
    <Dialog open={menu} onOpenChange={setMenu}><DialogContent className="play-menu-dialog"><DialogHeader><DialogTitle>Sua aventura</DialogTitle><DialogDescription>{p.roomName}. Todos os recursos da jornada em um lugar.</DialogDescription></DialogHeader><div className="play-menu-grid">{utilities.map(({label, icon: Icon, action, rest, hero}) => <button key={label} disabled={(hero && !p.hasHero) || (rest && (p.combat || p.busy))} onClick={() => run(action)}><Icon size={21} /><span>{label}</span>{rest && p.combat && <small>Após o combate</small>}</button>)}</div></DialogContent></Dialog>
    <Dialog open={atlas} onOpenChange={setAtlas}><DialogContent className="play-menu-dialog"><DialogHeader><DialogTitle>Atlas de Valdoria</DialogTitle><DialogDescription>O progresso da campanha libera novas rotas. Conclua o combate antes de viajar.</DialogDescription></DialogHeader><div className="travel-destinations">{destinations.map(d => <button key={d.biome} disabled={p.busy || p.combat || !p.hasHero} onClick={() => { setAtlas(false); p.onTravel(d.biome); }}><Compass size={22} /><span><strong>{d.name}</strong><small>{d.description}</small></span><span aria-hidden="true">→</span></button>)}</div></DialogContent></Dialog>
  </>;
}
