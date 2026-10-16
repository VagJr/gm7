'use client';

import { useState } from 'react';
import { ArrowRight, BookOpen, Compass, Globe2, Shield, Swords, Users } from 'lucide-react';

export type AdventureMode = 'solo' | 'coop' | 'mmo';

const modes = [
  { id: 'solo' as const, icon: Compass, title: 'Sua própria lenda', label: 'Solo', detail: 'Uma campanha privada. Explore Valdoria e tome suas decisões no seu ritmo.', meta: 'Mundo privado · Requer conexão' },
  { id: 'coop' as const, icon: Users, title: 'Uma história em grupo', label: 'Cooperativo', detail: 'Crie uma mesa e compartilhe o convite. Cada aliado traz novas possibilidades ao combate.', meta: 'Mesa privada · Convite por código' },
  { id: 'mmo' as const, icon: Globe2, title: 'Um mundo de encontros', label: 'Mundo online', detail: 'Encontre outros aventureiros na Vila do Rio Verde e forme um grupo para explorar.', meta: 'Vila compartilhada · Grupos de aventura' },
];

type Props = {
  busy: boolean;
  error: string;
  rooms: { id: string; name: string }[];
  onStart: (mode: AdventureMode, name: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onJoin: (code: string) => Promise<void>;
};

export function AdventureGateway({ busy, error, rooms, onStart, onResume, onJoin }: Props) {
  const [mode, setMode] = useState<AdventureMode>('solo');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [tab, setTab] = useState<'new' | 'saved'>('new');

  return <section className="adventure-gateway" aria-label="Início da aventura">
    <div className="gateway-art" aria-hidden="true" />
    <div className="gateway-content">
      <header className="gateway-header">
        <div className="gateway-brand"><Swords size={24} /><span>DRAGONS <small>AND DUNGEONS</small></span></div>
        <span className="gateway-build">PRÉ-LANÇAMENTO</span>
      </header>
      <div className="gateway-intro">
        <span className="gateway-kicker">VALDORIA AGUARDA</span>
        <h1>O próximo capítulo<br />começa com <em>você.</em></h1>
        <p>Além dos portões, uma floresta sussurra. Sob as ruínas, antigos selos cedem. Escolha seus aliados — e a história que vai deixar para trás.</p>
      </div>
      <div className="gateway-workspace">
        <div className="gateway-main">
          <div className="gateway-tabs" role="group" aria-label="Escolher jornada">
            <button type="button" aria-pressed={tab === 'new'} onClick={() => setTab('new')}>Nova jornada</button>
            <button type="button" aria-pressed={tab === 'saved'} onClick={() => setTab('saved')}>Continuar aventura</button>
          </div>
          {tab === 'new' ? <form onSubmit={(event) => { event.preventDefault(); void onStart(mode, name.trim()); }}>
            <fieldset className="gateway-modes" disabled={busy}>
              <legend className="sr-only">Como você quer jogar?</legend>
              {modes.map(({ id, icon: Icon, title, label, detail, meta }) => <label key={id} className={`gateway-mode ${mode === id ? 'is-selected' : ''}`}>
                <input type="radio" name="adventure-mode" value={id} checked={mode === id} onChange={() => setMode(id)} />
                <Icon size={23} aria-hidden="true" /><span className="gateway-mode-label">{label}</span>
                <h2>{title}</h2><p>{detail}</p><small>{meta}</small>
              </label>)}
            </fieldset>
            <div className="gateway-start">
              {mode !== 'mmo' && <label>Nome da campanha <span>(opcional)</span><input value={name} onChange={event => setName(event.target.value)} maxLength={80} placeholder={mode === 'solo' ? 'Minha jornada em Valdoria' : 'Os guardiões de Valdoria'} disabled={busy} /></label>}
              <button className="gateway-primary" disabled={busy} type="submit">{busy ? 'Preparando sua jornada…' : mode === 'mmo' ? 'Entrar no mundo' : 'Criar minha aventura'}<ArrowRight size={18} /></button>
            </div>
          </form> : <div className="gateway-saves">
            <h2>Suas campanhas</h2>
            {rooms.filter(room => room.id !== 'mmo-world-village').length === 0 && <p>Nenhuma campanha privada encontrada nesta sessão. Crie uma jornada ou use um convite abaixo.</p>}
            {rooms.filter(room => room.id !== 'mmo-world-village').map(room => <button disabled={busy} key={room.id} onClick={() => void onResume(room.id)}><BookOpen size={18} /><span>{room.name}</span><ArrowRight size={16} /></button>)}
            <button disabled={busy} onClick={() => void onResume('mmo-world-village')}><Globe2 size={18} /><span>Vila do Rio Verde · Mundo online</span><ArrowRight size={16} /></button>
          </div>}
          {error && <p className="gateway-error" role="alert">{error}</p>}
          <form className="gateway-invite" onSubmit={event => { event.preventDefault(); void onJoin(code.trim()); }}>
            <label htmlFor="gateway-code">Recebeu um convite?</label><input id="gateway-code" value={code} onChange={event => setCode(event.target.value)} placeholder="Código da mesa" required maxLength={64} disabled={busy} /><button disabled={busy || !code.trim()}>Entrar <ArrowRight size={16} /></button>
          </form>
        </div>
        <aside className="gateway-guide">
          <span className="gateway-kicker">SUA PRIMEIRA EXPEDIÇÃO</span>
          <h2>Prepare. Explore.<br />Volte mais forte.</h2>
          <ol><li><span>01</span><div><strong>Dê vida ao seu herói</strong><p>Escolha uma classe, seus atributos e equipamento.</p></div></li><li><span>02</span><div><strong>Atenda ao chamado</strong><p>Procure Doran na vila. Prepare suprimentos com Elenor e fale com a guarda.</p></div></li><li><span>03</span><div><strong>Enfrente o desconhecido</strong><p>Explore, lute por turnos e conclua os objetivos da jornada.</p></div></li><li><span>04</span><div><strong>Retorne e evolua</strong><p>Recupere recursos, equipe suas descobertas e prepare a próxima saída.</p></div></li></ol>
          <div className="gateway-rule"><Shield size={19} /><p>Combate tático: movimento, ação, ação bônus e reação. Sua posição importa.</p></div>
        </aside>
      </div>
      <footer className="gateway-footer"><span>Fantasia original · Regras baseadas no SRD 5.2.1</span><a href="/SRD-5.2.1.pdf" target="_blank" rel="noreferrer">Livro de referência ↗</a></footer>
    </div>
  </section>;
}
