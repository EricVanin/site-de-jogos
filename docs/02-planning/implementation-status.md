# Implementation Status

## Atualizado em 2026-04-03

## T01 - Setup base do projeto

- Status: concluido.
- Entregas:
  - monorepo com `apps/web`, `apps/server` e `packages/shared`;
  - build, lint e testes basicos no workspace;
  - workflow de CI em `.github/workflows/ci.yml`;
  - shell inicial do app e endpoint `/health` no backend.

## T02 - Contratos compartilhados

- Status: concluido.
- Entregas:
  - contratos HTTP compartilhados para guest session, salas e revanche;
  - envelopes de eventos WebSocket cliente/servidor com schemas Zod;
  - snapshot comum de sala e partida consumido por `web` e `server`;
  - catalogo de contratos exposto em `/api/meta` e coberto por testes.

## T03 - Estrutura de i18n (PT-BR/EN)

- Status: concluido.
- Entregas:
  - provider de i18n tipado com persistencia da preferencia no navegador;
  - dicionarios PT-BR e EN cobrindo as telas principais sem hardcoded;
  - troca de idioma sem reload validada por teste de interface;
  - labels de modos internacionalizados no pacote `shared`.

## T04 - Fluxo guest (`POST /api/guest/session`)

- Status: concluido.
- Entregas:
  - endpoint `POST /api/guest/session` no backend;
  - persistencia local do `guestId` no navegador;
  - bootstrap automatico da sessao ao abrir o app.

## T05 - Lobby mobile-first (criar/entrar sala)

- Status: concluido.
- Entregas:
  - fluxo mobile-first para criar e entrar em sala;
  - estados de lobby e espera do adversario na UI;
  - integracao do cliente com sessao, sala e realtime.

## T06 - Backend de salas (`create/join`, expiracao, validacoes)

- Status: concluido.
- Entregas:
  - backend em memoria para criar e entrar em salas por codigo;
  - expiracao de salas, validacoes de capacidade e erros estruturados;
  - respostas alinhadas aos contratos compartilhados.

## T07 - Gateway WebSocket e ciclo de partida

- Status: concluido.
- Entregas:
  - gateway WebSocket em `/ws` com assinatura em sala;
  - sincronizacao de `room.updated`, `match.state` e `move.applied`;
  - teste cobrindo dois clientes sincronizados sem dessync.

## T08 - Motor de regras: Classico 3x3

- Status: concluido.
- Entregas:
  - motor classico 3x3 com validacao de turno e ocupacao de casa;
  - deteccao server-side de vitoria e empate;
  - tabuleiro jogavel na interface conectado ao servidor autoritativo.

## T09 - Motor de regras: Sem Velha

- Status: concluido.
- Entregas:
  - modo `Sem Velha` habilitado no lobby e no backend de salas;
  - remocao automatica da peca mais antiga do mesmo jogador ao exceder 3 pecas;
  - validacao por testes para garantir que a peca do adversario nao e removida.

## T10 - Motor de regras: 5x5 vitoria em 4

- Status: concluido.
- Entregas:
  - modo `board-5x5-win-4` habilitado no backend de salas e no lobby;
  - partida inicializada com tabuleiro `5x5` e regra de vitoria em `4`;
  - deteccao server-side de linha valida sem falso positivo com apenas 3 pecas;
  - interface adaptada para renderizar o grid `5x5` de forma responsiva.

## T11 - Sistema de revanche em 1 clique

- Status: concluido.
- Entregas:
  - endpoint `POST /api/matches/{id}/rematch` com confirmacao por ambos os jogadores;
  - suporte ao evento `rematch.request` no WebSocket usando a mesma regra server-side;
  - nova partida criada automaticamente na mesma sala assim que ambos confirmam;
  - interface com CTA de revanche e estado de espera ate o adversario aceitar.
