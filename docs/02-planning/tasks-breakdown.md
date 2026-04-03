# Tasks Breakdown (T01-T20)

## Convencao

- `DoD`: Definition of Done (criterio de pronto).
- `Deps`: dependencias diretas para iniciar a task.
- `Status`: `concluida`, `em andamento` ou `pendente`.

## Backlog

### T01 - Setup base do projeto
- Deps: nenhuma.
- DoD: build e testes basicos em CI.
- Status: concluida.

### T02 - Contratos compartilhados
- Deps: T01.
- DoD: tipos comuns de jogo/eventos usados por front e back sem divergencia.
- Status: concluida.

### T03 - Estrutura de i18n (PT-BR/EN)
- Deps: T01.
- DoD: troca de idioma sem reload e sem hardcoded nas telas principais.
- Status: concluida.

### T04 - Fluxo guest (`POST /api/guest/session`)
- Deps: T01.
- DoD: usuario recebe `guestId` valido ao entrar.
- Status: concluida.

### T05 - Lobby mobile-first (criar/entrar sala)
- Deps: T03, T04.
- DoD: fluxo completo funcional no mobile.
- Status: concluida.

### T06 - Backend de salas (`create/join`, expiracao, validacoes)
- Deps: T02, T04.
- DoD: sala por codigo com regras e erros consistentes.
- Status: concluida.

### T07 - Gateway WebSocket e ciclo de partida
- Deps: T02, T06.
- DoD: dois clientes sincronizados sem dessync.
- Status: concluida.

### T08 - Motor de regras: Classico 3x3
- Deps: T07.
- DoD: vitoria/empate/turno corretos no servidor.
- Status: concluida.

### T09 - Motor de regras: Sem Velha
- Deps: T07.
- DoD: remocao automatica da peca mais antiga correta.
- Status: concluida.

### T10 - Motor de regras: 5x5 vitoria em 4
- Deps: T07.
- DoD: deteccao de vitoria sem falso positivo.
- Status: concluida.

### T11 - Sistema de revanche em 1 clique
- Deps: T07, T08.
- DoD: ambos confirmam e nova partida inicia corretamente.
- Status: concluida.

### T12 - Sistema de cartas/poderes (deck)
- Deps: T07.
- DoD: compra/uso/efeitos sincronizados e validados server-side.
- Status: concluida.

### T13 - Modo Rounds BO5
- Deps: T08, T09, T10, T12.
- DoD: serie encerra ao 3o ponto com historico consistente.
- Status: concluida.

### T14 - Anti-cheat basico
- Deps: T07.
- DoD: servidor rejeita jogadas invalidas e replay.

### T15 - Reconexao curta
- Deps: T07, T14.
- DoD: jogador reconecta e recupera estado sem inconsistencias.

### T16 - Banner ads (lobby/resultado)
- Deps: T05.
- DoD: banner nao cobre tabuleiro nem controles essenciais.

### T17 - Intersticial a cada 3 partidas
- Deps: T07, T16.
- DoD: exibicao correta de frequencia, nunca durante partida.

### T18 - Telemetria
- Deps: T07, T16, T17.
- DoD: eventos entregues com schema valido.

### T19 - QA funcional + multiplayer
- Deps: T08 ate T15.
- DoD: suite cobre cenarios criticos por modo e sincronizacao.

### T20 - QA mobile/performance + readiness
- Deps: T19.
- DoD: criterios de UX/perf aprovados e checklist de release concluido.
