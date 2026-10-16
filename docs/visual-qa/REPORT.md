# Revisão visual — Dragons and Dungeons 0.2.0

Data: 9 de outubro de 2026. Revisão pelo navegador integrado, com interação real na interface local e na publicação Vercel. As campanhas de teste têm o prefixo `[QA]`; nenhum save existente foi apagado.

## Telas verificadas

| Tamanho | Verificação |
| --- | --- |
| 320 × 568 | Menu com rolagem, menu da aventura, combate compacto e expandido, detalhes de ações |
| 390 × 844 | Criação em cinco passos, introdução, diálogos, inventário, navegação inferior, tabuleiro e combate |
| 844 × 390 | Tabuleiro em paisagem, controles, painel de ações, compatibilidade 2D |
| 768 × 1024 | Tabuleiro e retorno entre 2D e 3D no tablet |
| 1280 × 720 | Introdução e interface publicada, convite cooperativo e criação do segundo jogador |
| 1440 × 900 | Menu, tabuleiro, zoom, grade, menu da mesa e inventário |

As dimensões são simulações no navegador, não testes em seis aparelhos físicos.

## Problemas encontrados e corrigidos

- Menu do celular fora da tela: posicionamento corrigido e rolagem disponível nas telas menores.
- Inventário: título e quantidades deixaram de se sobrepor; botão de fechar tem área de toque de 44 pixels.
- Paisagem: espaço inferior indevido removido; narração, dica e minimapa não cobrem os controles na tela baixa.
- Aviso de turno: apresentação compacta no celular e deslocamento restante exibido corretamente.
- Grade: o botão agora corresponde à grade realmente exibida, inclusive durante o combate.
- Modo 2D: a câmera centraliza o herói; a imagem ocupa o distrito correto do mundo de 64 × 64; portais e NPCs usam as mesmas coordenadas do modo 3D. Tokens ilustrados substituem iniciais e símbolos de inimigos.
- Texturas: a estrada espera os dados da imagem antes de atualizar sua cópia na GPU. A remontagem da cena passou sem novos avisos ou erros de renderização.
- Artes: grades, legendas, coordenadas impressas e bússolas removidas das seis imagens de mapa. A comparação visual dos marcos principais foi registrada; os arquivos originais foram preservados.
- Provisões de Elenor: entrega feita no servidor uma única vez e contador de poções corrigido.
- Conflito de multiplayer: atualização do estado e uma nova tentativa de ações recusadas por versão antiga.
- Combate de outro jogador: não bloqueia movimento de quem não participa nem criação de um novo aventureiro. O teste real de convite revelou o bloqueio de criação e confirmou a correção depois da publicação.
- Texto: correção de acentos e de mensagens técnicas expostas na narrativa.

## Fluxos executados

Criação de Valeria QA, conversa com Doran/Elenor/Kaelen, recebimento de provisões, viagem à floresta, movimento pelo teclado, iniciativa, defesa, consumo da ação e avanço para a segunda rodada. Inventário, detalhes das ações, menus e alternância de renderização foram abertos e fechados.

Na publicação, outro navegador de sessão entrou com o convite da campanha, percorreu os cinco passos e criou Caelan QA enquanto o combate da primeira personagem continuava. A criação foi persistida e o segundo jogador apareceu na vila. Os testes de API usaram duas sessões assinadas independentes e confirmaram que a atualização de movimento chegou à outra sessão pelo fluxo de eventos.

## Verificação automática

- 109 verificações existentes: 109 passaram, zero falhas. [Registro](automatic-tests.log).
- Seis regiões: saídas, caminhos sem atravessar colisões, migração idempotente, criação autoritativa e isolamento de movimento durante outro combate passaram.
- Coop online: convite privado, criação durante outro combate, conflito sem recompensa parcial, provisões sem duplicação, movimento persistido e sincronização passaram localmente e em produção. [Registro de produção](production-coop.log).
- Sessões: isolamento de leitura/escrita de campanhas privadas, convite e proteção contra os três resets antigos passaram em produção.
- 80 imagens: arquivos válidos, 36 tokens com transparência e todas as imagens acessíveis por HTTP; documento de créditos SRD acessível.
- TypeScript e compilação de produção passaram.

## Capturas

- [Desktop em combate](desktop-board.jpg)
- [Versão publicada](production-board.jpg)
- [Versão publicada no celular](mobile-production.jpg)
- [Celular](mobile-board.jpg)
- [Tela compacta](compact-board.jpg)
- [Paisagem](landscape-board.jpg)
- [Modo 2D](compatibility-2d.jpg)
- [Inventário](mobile-inventory.jpg)
- [Menu de 390 pixels](mobile-menu.jpg)
- [Menu de 320 pixels](compact-menu.jpg)
- [Introdução no celular](intro-mobile.jpg)
- [Resumo do personagem em produção](character-summary-production.jpg)
- [Mapas antes e depois](map-comparison.jpg)

As capturas documentam os respectivos momentos da revisão; algumas precedem os últimos ajustes da grade e do aviso de turno.

## Artes e publicação

As artes foram editadas com a geração integrada `image_gen`, depois convertidas para WebP. Arquivos usados pelo jogo: `C:/gm7/public/maps/vila-v2.webp`, `mata-v2.webp`, `ruinas-v2.webp`, `dungeon-v2.webp`, `canyon-v2.webp` e `covil-v2.webp` na mesma pasta.

Prompts completos: [vila](../map-cleanup-prompt.json), [demais mapas](../maps-cleanup-prompts.json) e [identidade/tokens/terrenos](../art-prompts.json). Preparação reproduzível dos mapas: `scripts/prepare-clean-maps.mjs`.

[Abrir publicação](https://dragons-and-dungeons-nu.vercel.app). Banco compartilhado Neon configurado; a verificação de saúde indica `shared-postgres`.

Publicação final confirmada com estado `READY`: `dpl_BvgShiFehXf8q5tStStz6GSmsM3k`. A compilação passou com duas unidades de processamento; o teste local mantém apenas um servidor e a cena limita a renderização a 30 quadros por segundo, com pausa quando a aba está oculta.

## Limites desta revisão

Os fluxos acima passaram após as correções. Isso não certifica ausência de todos os erros: a campanha inteira até o chefe final, carga com muitos jogadores simultâneos, navegadores distintos e desempenho em aparelhos físicos ainda não foram validados. O mundo externo ao distrito ilustrado usa estruturas 3D simples nesta alpha; a direção de arte completa ainda precisa de produção adicional. A narração procedural foi verificada, mas não foi comprovada uma resposta de provedor de IA externo nesta revisão.
