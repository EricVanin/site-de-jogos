# PRD - MVP Site de Jogos da Velha

## 1) Resumo

- Plataforma: Web mobile-first.
- Multiplayer: online em tempo real por codigo de sala.
- Acesso: guest-only.
- Idiomas: PT-BR e EN.
- Monetizacao: banner + intersticial moderado.

## 2) Requisitos Funcionais

### 2.1 Entrada e Sessao

- Criar sessao guest ao entrar no site.
- Persistir `guestId` no dispositivo para continuidade local.

### 2.2 Lobby e Sala

- Criar sala por codigo.
- Entrar em sala existente por codigo.
- Exibir estado da sala: aguardando, em partida, encerrada.

### 2.3 Multiplayer em Tempo Real

- Sincronizar tabuleiro, turno e cronometro entre 2 clientes.
- Encerrar partida com resultado consistente para ambos.
- Revanche em 1 clique apos o fim.

### 2.4 Modos de Jogo

- Implementar os 5 modos definidos no arquivo `game-modes-spec.md`.

### 2.5 Internacionalizacao

- Todas as telas e mensagens em PT-BR e EN.
- Troca de idioma sem reload completo da pagina.

### 2.6 Monetizacao

- Banner em lobby e tela de resultado.
- Intersticial a cada 3 partidas concluidas.
- Nao exibir intersticial no meio da partida.

### 2.7 Telemetria

- Eventos obrigatorios:
  - inicio de partida
  - fim de partida
  - abandono
  - duracao
  - modo
  - impressao/click de anuncio

## 3) Requisitos Nao Funcionais

- UX mobile-first responsiva (largura >= 360px).
- Latencia percebida baixa para jogadas online.
- Validacao de regras no servidor (autoridade do estado).
- Reconexao curta com restauracao de estado.

## 4) Interfaces Publicas (alto nivel)

### 4.1 HTTP

- `POST /api/guest/session`
- `POST /api/rooms`
- `POST /api/rooms/{code}/join`
- `POST /api/matches/{id}/rematch`
- `POST /api/ads/impression`
- `POST /api/ads/click`

### 4.2 WebSocket

- Cliente -> Servidor:
  - `room.join`
  - `move.play`
  - `power.use`
  - `rematch.request`
- Servidor -> Cliente:
  - `match.state`
  - `move.applied`
  - `power.applied`
  - `match.ended`
  - `series.updated`
  - `error.rule_violation`

## 5) Seguranca e Anti-Cheat (MVP)

- Validar ordem de turno.
- Validar jogada legal no estado atual.
- Rejeitar replay de evento.
- Retornar erros estruturados para cliente.

## 6) Assuncoes

- Sem ranking no MVP.
- Sem login social no MVP.
- Sem matchmaking aleatorio no MVP.
