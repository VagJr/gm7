'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Compass, Globe2, Play, Swords, Users, X } from 'lucide-react';
import { GAME_BRAND } from '@/lib/brand';
export type AdventureMode = 'solo' | 'coop' | 'mmo';
type Props = { busy: boolean; error: string; rooms: { id: string; name: string }[]; onStart: (mode: AdventureMode, name: string) => Promise<void>; onResume: (id: string) => Promise<void>; onJoin: (code: string) => Promise<void> };
const modes = [
  { id: 'mmo' as const, icon: Globe2, label: 'Mundo online', note: 'Encontre aventureiros. Forme seu grupo.' },
  { id: 'coop' as const, icon: Users, label: 'Com seus aliados', note: 'Uma campanha privada por convite.' },
  { id: 'solo' as const, icon: Compass, label: 'Sua própria lenda', note: 'Seu herói. Suas escolhas. Sua jornada.' },
];
const scenes = [
  { title: 'Os selos estão cedendo.', text: 'Por séculos, as torres de Valdoria guardaram o que dormia sob a pedra.', art: '/art/dragons-menu.webp' },
  { title: 'A floresta se lembra.', text: 'Agora as estradas silenciam. Nas ruínas, uma chama antiga desperta.', art: '/maps/mata-v2.webp' },
  { title: 'Toda lenda começa com uma escolha.', text: 'Atravesse os portões. Encontre seus aliados. Escreva o destino deste mundo.', art: '/art/dragons-menu.webp' },
];
function WorldIntro({ onClose }: { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [scene, setScene] = useState(0);
  useEffect(() => { dialog.current?.showModal(); const timer = setInterval(() => setScene(s => Math.min(2, s + 1)), 7000); return () => clearInterval(timer); }, []);
  const frame = scenes[scene];
  return <dialog ref={dialog} className="dd-cinematic" onCancel={onClose} onClose={onClose} aria-label="O chamado de Valdoria"><div className="dd-cinematic-art" key={scene} style={{ backgroundImage: `url('${frame.art}')` }} /><div className="dd-cinematic-shade" /><button className="dd-cinematic-skip" onClick={onClose}>Pular introdução <X size={16} /></button><div className="dd-cinematic-copy" key={`copy-${scene}`}><span>O CHAMADO DE VALDORIA · {scene + 1}/3</span><h2>{frame.title}</h2><p>{frame.text}</p><button className="dd-primary" onClick={() => scene === 2 ? onClose() : setScene(scene + 1)}>{scene === 2 ? 'Minha história começa aqui' : 'Continuar'}<ArrowRight size={18} /></button></div></dialog>;
}
export function AdventureGateway({ busy, error, rooms, onStart, onResume, onJoin }: Props) {
  const [mode, setMode] = useState<AdventureMode>('mmo');
  const [name, setName] = useState(''); const [code, setCode] = useState('');
  const [tab, setTab] = useState<'new' | 'saved'>('new'); const [intro, setIntro] = useState(false);
  return <main className="dd-gateway" aria-label="Dragons and Dungeons — início">
    <div className="dd-keyart" aria-hidden="true" /><div className="dd-menu-shade" aria-hidden="true" />
    <div className="dd-embers" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${i * -.7}s`, animationDuration: `${8 + i % 7}s` }} />)}</div>
    <header className="dd-menu-header"><a className="dd-wordmark" href="/" aria-label={GAME_BRAND.name}><Swords size={22} /><span>DRAGONS <small>AND DUNGEONS</small></span></a><span className="dd-version">VALDORIA · ALPHA {GAME_BRAND.version}</span></header>
    <section className="dd-menu-main"><div className="dd-eyebrow"><span /> UM MUNDO. INCONTÁVEIS HISTÓRIAS.</div><img className="dd-logo" src="/art/dragons-logo.png" alt="Dragons and Dungeons" width="560" height="330" onError={e => { e.currentTarget.style.display = 'none'; }} /><h1>O mundo aguarda<br /><em>a sua lenda.</em></h1><p className="dd-menu-description">Além dos portões de Valdoria, algo antigo desperta.<br />Explore. Reúna seus aliados. Faça a sua escolha.</p>
      <nav className="dd-menu-tabs" aria-label="Jornada"><button aria-pressed={tab === 'new'} onClick={() => setTab('new')}>Jogar</button><button aria-pressed={tab === 'saved'} onClick={() => setTab('saved')}>Continuar</button><button onClick={() => setIntro(true)}><Play size={12} /> O chamado</button></nav>
      {tab === 'new' ? <form className="dd-start-form" onSubmit={e => { e.preventDefault(); void onStart(mode, name.trim()); }}><fieldset className="dd-modes" disabled={busy}><legend className="sr-only">Escolha seu modo</legend>{modes.map(({ id, icon: Icon, label, note }) => <label key={id} className={`dd-mode ${mode === id ? 'is-selected' : ''}`}><input type="radio" name="mode" checked={mode === id} onChange={() => setMode(id)} /><Icon size={24} /><span>{label}</span><small>{note}</small></label>)}</fieldset>{mode !== 'mmo' && <label className="dd-campaign-name">Nome da campanha <input value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="Uma nova história em Valdoria" disabled={busy} /></label>}<button type="submit" className="dd-primary dd-enter" disabled={busy}>{busy ? 'Abrindo os portões…' : mode === 'mmo' ? 'Entrar em Valdoria' : 'Começar aventura'}<ArrowRight size={20} /></button></form> : <div className="dd-saved">{rooms.filter(r => r.id !== 'mmo-world-village').length === 0 && <p>Suas campanhas aparecerão aqui. A sessão deste navegador guarda sua identidade.</p>}{rooms.filter(r => r.id !== 'mmo-world-village').map(r => <button key={r.id} disabled={busy} onClick={() => void onResume(r.id)}><BookOpen size={18} /><span>{r.name}</span><ArrowRight size={16} /></button>)}</div>}
      {error && <p className="dd-error" role="alert">{error}</p>}<form className="dd-invite" onSubmit={e => { e.preventDefault(); void onJoin(code.trim()); }}><Users size={15} /><label htmlFor="dd-invite">Convite do grupo</label><input id="dd-invite" placeholder="Código" value={code} onChange={e => setCode(e.target.value)} maxLength={64} required disabled={busy} /><button disabled={busy || !code.trim()} aria-label="Entrar com convite"><ArrowRight size={18} /></button></form>
    </section><aside className="dd-world-caption"><span>AS TERRAS DE VALDORIA</span><p>Deixe sua marca<br />em um mundo de escolhas.</p><div><i /> Exploração em tempo real · Combate tático</div></aside><footer className="dd-menu-footer"><span>Uma aventura original · SRD 5.2.1</span><a href="/SRD-5.2.1.pdf" target="_blank" rel="noreferrer">Regras e créditos ↗</a><span>Conexão necessária</span></footer>{intro && <WorldIntro onClose={() => setIntro(false)} />}
  </main>;
}
