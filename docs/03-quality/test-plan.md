# Test Plan (MVP)

## 1) Testes unitarios

- Motor de regras por modo.
- Validacao de turno.
- Validacao de vitoria/empate.
- Regras de poderes e BO5.

## 2) Testes de integracao (API + WS)

- Criacao de guest e sala.
- Entrada por codigo.
- Fluxo completo de partida ate resultado.
- Revanche e reinicio de estado.

## 3) Testes multiplayer concorrentes

- Jogadas simultaneas.
- Mensagens fora de ordem.
- Tentativa de jogada invalida.

## 4) Testes de reconexao

- Queda curta de rede.
- Reentrada na mesma sala e recuperacao de estado.

## 5) Testes de i18n

- Cobertura das chaves PT-BR/EN.
- Troca de idioma durante navegacao.

## 6) Testes de monetizacao

- Banner em lobby/resultado.
- Contador de partidas para intersticial.
- Garantia de nao exibicao durante partida.

## 7) Testes de UX e performance

- Responsividade em largura mobile comum.
- Tempo de entrada em sala dentro da meta.
- Jogabilidade sem travamento perceptivel.

## 8) Gate de release

- Sem bugs criticos abertos em fluxo principal.
- Todos os cenarios essenciais aprovados.
- Checklist final de deploy e monitoramento preenchido.
