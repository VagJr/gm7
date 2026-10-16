# Dragons and Dungeons — produção de arte e correções

Atualização de 9 de outubro de 2026. Estado: alpha 0.2.0.

Versão publicada: https://dragons-and-dungeons-nu.vercel.app/ — publicação `dpl_GLBD2NQUypoj9xgaxQZFrXx35N6y`. Saúde do serviço e folhas de arte verificadas novamente por HTTP após a publicação final.

## Arte entregue

- 45 peças próprias para interface: 36 ícones, três molduras, três botões e três materiais de fundo.
- 36 miniaturas novas, com seleção de figura inteira e margem transparente de segurança.
- 36 elementos de cenário: árvores, construções, ruínas, santuários, baús e elementos vulcânicos.
- Materiais de pedra, couro e bronze aplicados ao menu inicial, criação, ações, inventário, atlas, menus e diálogos.
- Folhas originais mantidas em `public/art/miniatures-sheet.png`, `scenery-sheet.png`, `ui-panels-sheet.png` e `ui-icons-sheet.png`.
- Geração pela ferramenta integrada de imagens; prompts completos em `art-prompts.json` e `hud-prompts.json`. Recorte e exportação em WebP nos scripts `prepare-production-assets.mjs` e `prepare-hud-art.mjs`.

## Correções de funcionamento

- Recarregar ou fechar a página registra desconexão sem apagar o personagem.
- Seleção após criação usa o identificador definitivo retornado pelo servidor.
- Troca de aventura compara versões apenas dentro da mesma sala.
- Combates independentes por herói ou grupo preservam iniciativa e recursos de outros jogadores.
- Ataques validam o adversário pertencente ao combate; descanso afeta apenas o herói/grupo correspondente.
- Personagens novos não herdam provas de campanha de logs e cadáveres públicos.
- Movimento reduzido para aproximadamente 2,2 casas por segundo; pedidos sucessivos aguardam o trajeto visual.
- Mapas de mundo usam terreno e elementos individuais; a imagem central antiga foi removida do mundo expandido.
- Masmorras usam as paredes, portas e dimensão do andar persistido para validar movimento e destinos de magia.
- Equipamento inicial corrigido e atributo de conjuração definido pelo servidor para as 12 classes.

## Verificação realizada

- TypeScript sem erros; compilação de produção na Vercel aprovada.
- 109 verificações de regressão passaram (`regression.log`).
- 161 imagens verificadas; margens de segurança dos 72 tokens/cenários validadas, arquivos acessíveis por HTTP e SRD disponível.
- Coop com dois clientes: convite, provisões únicas, deslocamento persistido e atualização recebida por SSE.
- MMO publicado com dois clientes: batalhas simultâneas, iniciativa, movimento, ataques, IA dos inimigos, vitória com 275 XP, saque, descanso isolado e desconexão preservando os personagens.
- Navegador: criação em cinco etapas, miniatura escolhida, movimento e recarregamento mantendo nome, vida e coordenadas 33,34.
- Conferência visual de menu, criação, tabuleiro, ações e inventário. Capturas nesta pasta. Sem imagens quebradas ou transbordamento horizontal na tela verificada de 1124 px.

## Limites da entrega

O projeto continua alpha. Estes testes não comprovam que todas as regras, subclasses, magias e conteúdos do SRD estejam completos, nem substituem testes de carga de um MMORPG. O armazenamento usa Postgres compartilhado; o mundo atual tem limite de 32 personagens persistidos e campanhas privadas de 12. Vercel e Neon Free têm cotas finitas. A IA externa com credenciais próprias não foi validada nesta atualização; o fallback procedural foi exercitado.

Na conferência final, a criação publicada foi verificada em 390 × 844 px: seleção de miniaturas sem transbordamento horizontal ou imagens quebradas (`creator-mobile-final.png`). O menu e a retomada do jogo foram conferidos em 1124 × 884 px (`hud-menu-final.png`), sem erros de console registrados. A tentativa de mudar o tabuleiro local para tela compacta não alterou sua largura efetiva; portanto, não há aprovação visual do fluxo completo em celular.

Documentação consultada para investigar sessão/cookies: [Next.js — Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy). A causa encontrada foi a remoção do herói na ação de desconexão, corrigida na rota do jogo.
