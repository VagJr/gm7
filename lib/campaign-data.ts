// lib/campaign-data.ts
// Campanha Concreta: O Selo das Três Cinzas (D&D 5e SRD 5.2.1)

export interface CampaignObjective {
  id: string;
  text: string;
  completed: boolean;
  xpReward: number;
}

export interface CampaignAct {
  act: 1 | 2 | 3;
  title: string;
  subtitle: string;
  locationName: string;
  locationIndex: number;
  description: string;
  bossName?: string;
  bossMaxHp?: number;
  objectives: CampaignObjective[];
  dialogueIntro: string;
  dialogueVictory: string;
}

export const CAMPAIGN_ACTS: Record<1 | 2 | 3, CampaignAct> = {
  1: {
    act: 1,
    title: 'Ato I: O Selo do Rio Verde',
    subtitle: 'A Sombra sobre a Vila & O Claustro das Cinzas',
    locationName: 'Vila do Rio Verde • Assentamento de Valdoria',
    locationIndex: 0,
    description: 'Criaturas de cinzas rondam a ponte leste da pacífica Vila do Rio Verde. O Ancião Doran e a guarda convocam bravos aventureiros para purificar a antiga abadia da fronteira.',
    bossName: 'Sentinela de Cinzas',
    bossMaxHp: 12,
    objectives: [
      { id: 'act1-npc-doran', text: 'Conversar com o Ancião Doran e aceitar a missão', completed: false, xpReward: 50 },
      { id: 'act1-npc-elenor', text: 'Obter Poções de Cura com a Alquimista Elenor', completed: false, xpReward: 50 },
      { id: 'act1-sentinel', text: 'Derrotar o Sentinela de Cinzas na ponte leste', completed: false, xpReward: 100 }
    ],
    dialogueIntro: 'O sino da torre velha tocou. As águas do rio parecem turvas e sombras rastejam entre as árvores. A aventura começa em Vila do Rio Verde.',
    dialogueVictory: 'O Sentinela de Cinzas desintegra-se em brasas soprosas. A passagem para as catacumbas sagradas foi desobstruída!'
  },
  2: {
    act: 2,
    title: 'Ato II: As Catacumbas dos Três Selos',
    subtitle: 'O Labirinto dos Escribas Caídos',
    locationName: 'Catacumbas dos Três Selos • Subterrâneo',
    locationIndex: 1,
    description: 'Abaixo da abadia, arcos de pedra sustentam câmaras funerárias esquecidas. Três inscrições rúnicas brilham no escuro, trancando a passagem para o santuário interior.',
    bossName: 'Guardião Espectral',
    bossMaxHp: 22,
    objectives: [
      { id: 'act2-seals', text: 'Encontrar e decifrar os 3 Selos Rúnicos nas paredes', completed: false, xpReward: 100 },
      { id: 'act2-chest', text: 'Abrir o baú ancestral dos escribas e resgatar a Chave de Obsidiana', completed: false, xpReward: 75 },
      { id: 'act2-boss', text: 'Derrotar o Guardião Espectral que vigia a ponte do abismo', completed: false, xpReward: 125 }
    ],
    dialogueIntro: 'O ar aqui embaixo cheira a poeira e ozônio arcano. Sussurros ecoam das sepulturas abertas.',
    dialogueVictory: 'As runas da porta final se iluminam em chamas violetas. A passagem para o Santuário do Vazio está aberta!'
  },
  3: {
    act: 3,
    title: 'Ato III: O Trono do Vazio',
    subtitle: 'O Confronto Final contra o Lorde das Cinzas',
    locationName: 'Santuário do Vazio • Profundezas',
    locationIndex: 2,
    description: 'No coração das profundezas, uma fenda para o Vazio pulsa com poder cósmico. Malakor, o Lorde das Cinzas, realiza o ritual final para libertar as sombras sobre Valdoria.',
    bossName: 'Malakor, o Lorde das Cinzas',
    bossMaxHp: 38,
    objectives: [
      { id: 'act3-pillars', text: 'Canalizar o poder dos pilares rúnicos para enfraquecer o ritual', completed: false, xpReward: 150 },
      { id: 'act3-boss', text: 'Derrotar Malakor, o Lorde das Cinzas', completed: false, xpReward: 300 },
      { id: 'act3-seal', text: 'Colocar o medalhão no altar do centro e selar a fenda para sempre', completed: false, xpReward: 200 }
    ],
    dialogueIntro: 'O Lorde das Cinzas se ergue do trono de pedra negra: "Vocês chegaram tarde demais, mortais. O Vazio consome tudo."',
    dialogueVictory: 'A fenda se fecha em um clarão de luz dourada. A vila descansa em paz, e suas lendas serão cantadas por eras em Valdoria!'
  }
};
