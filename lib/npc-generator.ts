// lib/npc-generator.ts
// Gerador de NPCs Vivos e Persistentes para D&D 5e (SRD 5.2.1)

export interface GeneratedNpc {
  id: string;
  name: string;
  species: string;
  role: string;
  archetype: 'aliado' | 'neutro' | 'misterioso' | 'hostil';
  personality: string;
  secret: string;
  description: string;
  dialogueIntro: string;
  options: { label: string; actionText: string; outcome?: string }[];
}

const NPC_FIRST_NAMES = ['Kaelen', 'Mira', 'Vaelin', 'Seraphina', 'Doran', 'Thorgar', 'Baelor', 'Elowen', 'Cassian', 'Lyris'];
const NPC_TITLES = ['a Guardiã de Segredos', 'o Eremita Cinzento', 'o Ladino Silencioso', 'a Tecelã de Runas', 'o Cavaleiro Caído', 'o Monge Cego'];
const NPC_SPECIES = ['Humano', 'Elfo', 'Anão', 'Halfling', 'Tiefling', 'Draconato'];

export function generateRandomNpc(seed = Date.now()): GeneratedNpc {
  const rand = (max: number) => Math.floor((Math.sin(seed++) + 1) / 2 * max);

  const name = `${NPC_FIRST_NAMES[rand(NPC_FIRST_NAMES.length)]}, ${NPC_TITLES[rand(NPC_TITLES.length)]}`;
  const species = NPC_SPECIES[rand(NPC_SPECIES.length)];

  const roles = [
    {
      role: 'Aliada • Eremita e Erudita',
      archetype: 'aliado' as const,
      desc: 'Vive nos ermos da abadia há décadas. Conhece as passagens secretas e as fraquezas dos sentinelas.',
      intro: 'Abaixe sua lâmina, viajante. As cinzas deste lugar devoram tanto os tolos quanto os corajosos.',
      options: [
        { label: 'Como você sobreviveu tanto tempo aqui?', actionText: 'Pergunta a ela sobre sua sobrevivência nas ruínas.' },
        { label: 'Você sabe como abrir o selo da cripta?', actionText: 'Pede instruções sobre o selo da cripta.' },
        { label: 'Tem poções ou suprimentos para trocar?', actionText: 'Oferece ouro por suprimentos alquímicos.' }
      ]
    },
    {
      role: 'Neutro • Fantasma do Antigo Abade',
      archetype: 'misterioso' as const,
      desc: 'Um espírito preso a uma promessa ancestral que recusa o descanso eterno até que o sino repouse em paz.',
      intro: 'O sino tocou... Você ouve o eco que rasga a eternidade? Quem é você para pisar no santuário das cinzas?',
      options: [
        { label: 'Vim silenciar o mal que desperta aqui.', actionText: 'Declara intenções nobres ao espírito.' },
        { label: 'O que causou a queda da abadia?', actionText: 'Pergunta a respeito da queda histórica da abadia.' },
        { label: 'Diga-me o segredo do Lorde das Cinzas.', actionText: 'Exige saber o ponto fraco do vilão.' }
      ]
    },
    {
      role: 'Comerciante • Mercador de Relíquias',
      archetype: 'neutro' as const,
      desc: 'Um aventureiro astuto que coleta joias e artefatos de heróis caídos nas profundezas.',
      intro: 'Ouro e aço valem mais que orações neste buraco esquecido. O que você procura para não morrer hoje?',
      options: [
        { label: 'Mostre-me seus itens mágicos e poções.', actionText: 'Inspeciona as mercadorias à venda.' },
        { label: 'Comprou algo que veio das catacumbas?', actionText: 'Investiga os artefatos encontrados no subterrâneo.' },
        { label: 'Cuidado, criaturas rondam esta câmara.', actionText: 'Adverte o mercador sobre os perigos.' }
      ]
    }
  ];

  const picked = roles[rand(roles.length)];

  return {
    id: `npc-${Date.now()}-${rand(9999)}`,
    name,
    species,
    role: picked.role,
    archetype: picked.archetype,
    personality: 'Cauteloso, marcado pelo isolamento, voz rouca e olhos atentos.',
    secret: 'Carrega um pedaço de chumbo com inscrições da ordem sacerdotal.',
    description: picked.desc,
    dialogueIntro: picked.intro,
    options: picked.options
  };
}
