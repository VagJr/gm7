# Dragons and Dungeons

RPG de fantasia em Valdoria: campanhas solo e cooperativas por convite, mundo online compartilhado e combate tático. Versão **0.2.0 alpha**.

Publicado em https://dragons-and-dungeons-nu.vercel.app.

## Implementação

- React 19, Next.js 16 e TypeScript; cenário Three.js com câmera ortográfica, miniaturas ilustradas, árvores, objetos, movimento por caminhos e efeitos.
- Seis regiões de 64 × 64 casas, com distritos ilustrados, estradas, rios e pontos de exploração. As masmorras usam atividades persistidas.
- Menu e introdução próprios, logo e 72 recortes de duas folhas 6 × 6. A vila tem uma nova camada de arte sem grade ou legendas.
- Vercel Functions e Postgres compartilhado no Neon Free. SQLite fica disponível como alternativa local sem DATABASE_URL.
- Cookies assinados, autorização por participante, convites privados, controle de versões e atualizações SSE. As rotas antigas de exclusão global estão bloqueadas.
- Diretora procedural com contexto de economia, ecossistema e memória. Narração Groq/Gemini depende de credencial válida; o fallback procedural foi testado.

## Rodar localmente

Node >=22.13.0. Instale com `npm run install:ci`, execute `npm run dev` e abra http://localhost:5173. Use apenas um servidor local. O limite de memória e o número de trabalhadores estão reduzidos para o desenvolvimento.

Quando DATABASE_URL está presente, o desenvolvimento usa o banco compartilhado. Testes de sessão criam campanhas com prefixo [QA] e preservam os saves existentes. Não publique credenciais nem arquivos .env.

## Verificação

- `npm run typecheck`: tipos da aplicação.
- `npm run test:all`: oito suítes existentes, 109 verificações. Algumas são verificações estáticas; o conjunto não certifica fidelidade completa ao SRD.
- `node scripts/test-dragons-world.mjs`: seis regiões, colisões, caminhos, migração, criação autoritativa e isolamento do movimento em relação ao combate de outro jogador.
- `npm run test:session`: criação privada, autorização, convite e proteção dos saves.
- `node scripts/test-coop-flow.mjs`: dois jogadores, convite, recuperação de conflito, provisões sem duplicação e movimento recebido por SSE. Aceita TEST_BASE_URL para verificar a publicação.
- Capturas e relatório dos testes visuais em docs/visual-qa. Os prompts das artes estão em docs/art-prompts.json e docs/map-cleanup-prompt.json; geração pelo image_gen integrado.

## Limites atuais

Este é um alpha. O cenário mistura superfícies ilustradas, sprites de miniaturas e objetos 3D; ainda não corresponde a um mundo totalmente modelado. Existem regras e habilidades que dependem de arbitragem ou mantêm adaptações legadas. O catálogo de 339 magias não significa que cada detalhe do SRD esteja implementado.

Os planos gratuitos têm cotas. O mundo compartilhado tem limite atual de 32 personagens e não foi certificado sob carga MMO. O transporte pode levar até três segundos entre instâncias. A arquitetura grava o estado da sala como um documento com controle de versão; carga maior exigirá particionamento, simulação e persistência mais granular. Não há promessa de serviço gratuito sem limites.

A campanha completa, todas as classes, todas as regiões em combate, dispositivos móveis físicos, backup/restauração e uso real de provedores de IA ainda precisam de validação adicional.
