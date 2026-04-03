# Game Modes Spec (MVP)

## 1) Classico 3x3

- Tabuleiro: 3x3.
- Objetivo: alinhar 3 simbolos.
- Resultado: vitoria, derrota ou empate.

## 2) Sem Velha (pecas somem)

- Tabuleiro: 3x3.
- Objetivo: alinhar 3 simbolos.
- Regra especial:
  - Cada jogador pode manter ate 3 pecas no tabuleiro.
  - Ao jogar uma nova peca acima do limite, a peca mais antiga do mesmo jogador e removida automaticamente.
- Resultado: sempre decidivel (evita empate permanente).

## 3) Poderes (deck)

- Tabuleiro base: 3x3.
- Deck inicial: 3 cartas aleatorias por jogador por partida.
- Uso: poder acionado por evento `power.use`, validado pelo servidor.
- Estrutura base de carta:
  - `cardId`
  - `effectType`
  - `targetRule`
- Regras de MVP:
  - Nao pode quebrar autoridade do turno.
  - Efeito invalido retorna erro estruturado.

## 4) Tabuleiro Maior 5x5

- Tabuleiro: 5x5.
- Objetivo: alinhar 4 simbolos consecutivos.
- Resultado: vitoria ou empate.

## 5) Rounds BO5

- Formato: melhor de 5.
- Vence o confronto quem atingir 3 vitorias primeiro.
- Cada round usa rotacao de modos predefinida pelo servidor.
- Mantem placar acumulado e historico de rounds.
