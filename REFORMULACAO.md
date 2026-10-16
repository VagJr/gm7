# Dragons and Dungeons — direção de produto e auditoria

Data: 17/09/2026. Estado: pré-lançamento, reformulação iniciada. Este documento não certifica prontidão comercial. As decisões abaixo definem o produto pretendido; apenas a seção “Entregue nesta revisão” descreve implementação concluída.

## Diagnóstico

Existe um RPG tático web substancial, com campanha, criação de personagens, catálogo de magias, inventário, NPCs, colisões, atividades persistidas, masmorras e integração narrativa por IA. React e Vinext servem a interface; SQLite com WAL persiste salas; API, SSE e caminhos WebSocket coexistem. O README anterior descrevia D1 e capacidades de uma versão mais antiga.

A estrutura ainda mistura mesa virtual, RPG solo e mundo compartilhado. `app/game.tsx`, `app/api/game/route.ts` e `lib/game-engine.ts` concentram responsabilidades extensas. Vários testes verificam presença de strings no código, portanto um resultado verde não comprova fidelidade das regras nem funcionamento multiplayer em carga.

Problemas encontrados na inspeção:

| Área | Evidência | Consequência |
| --- | --- | --- |
| Entrada solo | O seletor anterior abria o criador na sala atual | Personagem solo podia nascer no mundo compartilhado |
| Privacidade | GET e POST adicionavam membro ao receber ID de sala | Código de convite podia ser contornado |
| Persistência | GET removia personagens com `lastSeen` antigo | Ausência podia virar perda permanente de personagem |
| Reset | Rotas antigas removiam todas as salas das quais o usuário participava | Um membro podia afetar campanhas de outros jogadores |
| Criação | Cliente anunciava personagem antes de salvar; criador fechava mesmo em falha | Personagem fantasma e perda do formulário |
| Concorrência | Uma ação enfileirada aguardava outra ação na própria fila | Conflito de viagem podia travar a fila |
| Expedição | Modo grupo selecionava todos os personagens da sala | Jogadores alheios podiam entrar na lista da atividade |
| Identidade | Cookie legado permite construir identidade e headers externos são aceitos | Isolamento por membro ainda depende de autenticação confiável |
| Transporte | Plugin WebSocket de desenvolvimento retransmite mensagens sem validação | Caminhos de execução têm garantias diferentes |
| Regras | Criação exibe descrições e bônus de espécies de versões distintas | Não há evidência de conformidade integral com SRD 5.2.1 |
| Interface | Marcas diferentes, perfil fixo e apresentação sobreposta ao criador | Produto parece composto de protótipos |

## Produto pretendido

Um RPG de fantasia com combate tático e expedições: uma campanha que pode ser vivida sozinho, com amigos ou a partir de uma vila online compartilhada. Identidade única: Dragons and Dungeons. Mundo: Valdoria. Vila inicial: Vila do Rio Verde. Campanha: O Despertar das Cinzas.

A fantasia principal é preparar uma expedição, tomar decisões em encontros perigosos, retornar com descobertas e ver consequências no mundo. IA enriquece a narração; iniciar, lutar, avançar, receber recompensas e concluir uma missão devem funcionar sem serviços de IA.

| Modo | Contrato de experiência | Estado e interação |
| --- | --- | --- |
| Solo | Campanha privada, ritmo próprio, objetivos viáveis sem grupo obrigatório | Uma identidade controla o herói; salvar requer servidor nesta versão; não anunciar modo offline |
| Cooperativo | Campanha por convite, objetivo partilhado, participação explícita | Grupo alvo de 2–4 jogadores; confirmar capacidade por balanceamento e testes antes de anunciar limite |
| Mundo online | Vila social, formação de grupos, encontros e expedições | Presença compartilhada; combate e recompensas isolados por atividade/grupo |

Não tratar uma sala global como capacidade MMO comprovada. Escala, regiões, limite de lotação e servidores precisam de medição. Transferência de heróis entre modos não está implementada: preservar campanhas existentes e impedir duplicação de itens antes de oferecer migração.

## Loop e ritmo

1. Na vila, o jogador vê o próximo objetivo, prepara cura, equipamento e recursos.
2. Escolhe destino ou contrato com duração estimada, ameaça, requisitos e recompensa compreensíveis.
3. Explora uma rota com descoberta, interação e encontro. Todo combate tem motivo e condição de resolução.
4. Decide gastar recursos, procurar uma rota alternativa ou retornar. Recuar deve ser uma escolha utilizável.
5. Conclui o objetivo ou extrai da masmorra. O servidor registra resultado e recompensa uma única vez.
6. Na vila, identifica melhorias, recupera recursos, evolui e desbloqueia a próxima oportunidade.

Metas de design a validar em sessões: primeiro objetivo em até 2 minutos após criação; primeiro encontro em 5–8 minutos; contrato de 10–20 minutos; masmorra de 20–40 minutos. Não são métricas atuais.

O tutorial usa Doran, Elenor e Kaelen, com orientação contextual. Evitar três diálogos obrigatórios extensos antes de o jogador agir. Ensinar movimento e interação na vila, posição e ação no primeiro combate, recursos e descanso no retorno. Oferecer resumo para veteranos.

## Regras e combate

Adotar um perfil versionado de regras. Cada classe, magia, condição e item precisa indicar implementação exata, adaptação de videogame ou adjudicação manual. Remover promessas de suporte integral antes de auditar o catálogo.

O servidor valida identidade, propriedade, participação, posição, alcance, linha de visão, economia de ações, recursos e alvos antes de sortear resultados. O cliente envia intenção; nunca determina dano, tesouro ou progressão. Toda ação rejeitada informa o motivo sem consumir recurso.

Centralizar movimento, ação, ação bônus e reação num resolvedor. Reações precisam de uma política clara para não interromper indefinidamente grupos online. Repetir um comando com a mesma chave não pode gastar recursos nem conceder recompensa duas vezes. Conflitos retornam estado atual; o jogador pode tentar novamente.

Testar diferenças entre número de participantes e nível: ajustar quantidade, composição e objetivos, não apenas PV. Em solo, priorizar oportunidades de cobertura, cura e retirada; em coop, criar decisões complementares sem exigir uma composição específica. Encontros avançados devem anunciar ataques perigosos antes de resolvê-los.

Morte, derrota total, desconexão em combate, descanso e extração precisam de uma política única persistida. Proposta inicial: derrota devolve o herói à vila com custo recuperável, preservando progressão; recompensas ainda não extraídas pertencem à atividade. Esta política precisa ser implementada e balanceada antes de substituir regras existentes.

## Conteúdo e progressão

Manter a campanha existente como espinha inicial, reescrevendo objetivos e consequências de forma uniforme:

| Região | Função | Conteúdo a consolidar |
| --- | --- | --- |
| Vila | Aprender, preparar e socializar | Doran, Elenor, Kaelen, contratos e retorno |
| Floresta | Primeiro risco | Ponte bloqueada, sentinelas e descoberta dos selos |
| Ruínas | Exploração e posicionamento | Culto das Cinzas, cobertura e acesso às catacumbas |
| Catacumbas | Gestão de recursos | Salas com escolhas, armadilhas, santuários e Malakor |
| Desfiladeiro | Preparação para o clímax | Vanguarda dracônica e rotas perigosas |
| Covil | Domínio do sistema | Ignisrax com fases legíveis, conclusão e epílogo |

Cada missão deve conter pré-requisitos, objetivo observável, progresso por herói/grupo, condições de sucesso e falha, recompensa idempotente e consequências. Não conceder conclusão apenas por viajar ou receber texto da IA. Desbloqueios devem consultar a mesma evidência na API, mapa e diário.

Endgame proposto: contratos com modificadores, expedições progressivas, variantes de encontros e conquistas. Evitar inflação infinita de equipamento. Primeiro provar que uma jornada completa e repetível é boa antes de ampliar o volume procedural.

Economia proposta: moedas obtidas em missões e expedições; gastos em suprimentos, serviços e melhorias previsíveis. Toda alteração de saldo e inventário é transacional e auditável. Comércio entre jogadores exige registro de duas pontas, confirmação e prevenção de duplicação. Não está pronto nesta revisão.

## Interface e direção visual

Base visual: pedra escura, verde azulado, dourado discreto, tipografia serifada nos títulos e leitura simples nos controles. Arte de ambiente oferece contexto; estado de combate continua legível. Reduzir gradientes, bordas concorrentes, emojis e animação permanente.

Entrada: três modos, campanhas existentes, convite, resumo do loop e mensagens de erro. Implementada nesta revisão.

Tela de exploração pretendida: mapa central, objetivo atual compacto, grupo recolhível e quatro acessos principais — personagem, inventário, diário e opções. Ferramentas de mapa e depuração ficam fora do fluxo comum. Disponibilizar retorno ao início também na navegação móvel.

Tela de combate pretendida: iniciativa, turno atual, recursos restantes, ações válidas, alvo e prévia de custo/alcance. Cor não pode ser o único indicador. Teclado e toque devem oferecer as mesmas ações. Modais precisam conter foco, fechar com Escape e restaurar o foco anterior.

Auditar a criação: corrigir textos quebrados, nomenclatura e regras; validar escolhas no servidor; preservar formulário em falha; mostrar resumo com origem dos valores. Zoom foi liberado nesta revisão, mas acessibilidade do restante do jogo ainda precisa de trabalho.

## Sistemas para lançamento

Separar domínio de conta/personagem, campanha, grupo, atividade, combate, inventário, economia e conteúdo. Criar comandos tipados por sistema e testes do contrato. Extrair gradualmente do arquivo central preserva saves e reduz risco.

Autenticação é bloqueio de lançamento: sessões opacas verificadas pelo servidor ou assinadas, expiração, revogação e política explícita de confiança no proxy. Não migrar silenciosamente cookies de identidade manipuláveis para credenciais confiáveis. Planejar recuperação e associação de saves anônimos.

Unificar a entrega de eventos autenticados entre desenvolvimento e produção. Separar presença de personagem persistido. Reentrada consulta snapshot mais revisão; eventos antigos não substituem estado novo. Instâncias de combate usam membros explícitos. Nenhum cliente deve poder anunciar entrada ou alteração mecânica como autoridade.

Persistência precisa de migrações testadas, cópia de segurança e restauração ensaiada, log de comandos e estratégia de concorrência. SQLite local exige decidir topologia e armazenamento persistente antes de replicar servidores. Medir tamanho de snapshots e reduzir atualizações completas do mundo.

Operação: erros estruturados, limites de requisições, observabilidade de latência e conflitos, métricas de desconexão, versão do protocolo e recuperação após reinício. Auditoria dos endpoints administrativos e de IA permanece necessária.

## Entregue nesta revisão

- Nova entrada responsiva com os três modos, campanhas, convite e orientação do loop.
- Solo e cooperativo criam salas privadas antes da criação do personagem.
- GET e POST de sala recusam acesso por ID sem participação; convite mantém o caminho de entrada.
- Removida exclusão de personagens por ausência durante leitura do mundo.
- Rotas de wipe/reset global desativadas; nova campanha preserva saves anteriores.
- Criador permanece aberto se salvar falhar; removido anúncio otimista de personagem antes da confirmação.
- Removida espera circular da fila em conflito de viagem.
- Expedição em grupo filtra participantes pelo grupo do herói.
- Correções de tipos, som de evolução, atributo de Destreza em armadilhas e contexto de fallback narrativo.
- Identidade visual do painel de grupo corrigida, perfil fictício removido e apresentação automática sobreposta ao criador removida.
- Teste HTTP novo para privacidade, convite e bloqueio de resets.

## Critérios de saída e próximos marcos

1. **Segurança e integridade:** identidade confiável; endpoints administrativos auditados; testes de acesso negativo; isolamento de atividade; nenhuma duplicação em concorrência; recuperação de backup comprovada.
2. **Fatia jogável completa:** criar → receber missão → explorar → combater → extrair → evoluir → reconectar, em solo e dois clientes cooperativos, sem IA obrigatória.
3. **Regras e conteúdo:** perfil versionado; matriz de suporte revisada; criação e progressão consistentes; campanha concluída sem comandos de depuração; testes de balanceamento com jogadores.
4. **Experiência final:** HUD e criador redesenhados, navegação móvel, teclado, zoom, foco, feedback de conexão e revisão de todos os textos.
5. **Operação online:** teste de carga com alvo declarado, estabilidade prolongada, reconexão, atualizações de versão, telemetria e plano de reversão.

Nenhum marco é substituído por build verde. Ainda não foi realizada validação de carga MMO, campanha inteira em múltiplos clientes, fidelidade integral das regras, restauração de backup ou teste real dos provedores de IA.

## Evidências de validação desta revisão

- `npm run typecheck`: aprovado após corrigir os erros encontrados.
- `npm run build`: aprovado; permanece aviso de pacotes de cliente acima de 500 kB.
- `npm run test:all`: 119 verificações aprovadas nas oito suítes existentes. Saída em `validation-tests.log`.
- `node scripts/test-launch-session.mjs`: aprovado contra servidor local, incluindo bloqueio de leitura/escrita privada, convite e resets.
- Lint dos novos componentes/scripts e da rota de wipe: aprovado. Lint global reprovou; a execução registrada em `lint-audit.log` apontou 530 ocorrências, incluindo um erro da nova entrada corrigido em seguida. A dívida restante não foi eliminada.
- Navegador: entrada desktop, layout em 390 × 844, criação de sala solo e retomada após recarregar verificadas. Campanhas `[QA]` foram preservadas no banco local.
