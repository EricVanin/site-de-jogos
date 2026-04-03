# Acceptance Criteria

## Gameplay (todos os modos)

- Estado de partida identico nos dois clientes.
- Turno sempre alterna corretamente.
- Encerramento de partida unificado para ambos os jogadores.

## Por modo

### Classico 3x3
- Detecta vitoria horizontal, vertical e diagonal.
- Detecta empate quando cabivel.

### Sem Velha
- Ao exceder limite de pecas, remove a mais antiga do mesmo jogador.
- Nao remove peca do adversario por engano.

### Poderes
- Carta invalida e rejeitada com erro estruturado.
- Carta valida aplica efeito com sincronizacao.

### 5x5 (vitoria em 4)
- Vitoria apenas com 4 consecutivos.
- Sem falso positivo por pecas desconexas.

### Rounds BO5
- Placar acumulado correto.
- Serie termina assim que um jogador chega a 3 vitorias.

## Multiplayer e resiliencia

- Jogadas simultaneas conflitando sao resolvidas pelo servidor.
- Reconexao curta restaura estado atual.
- Revanche em 1 clique funciona para ambos.

## Monetizacao

- Banner visivel sem atrapalhar interacao principal.
- Intersticial a cada 3 partidas concluidas.
- Intersticial nunca abre durante partida.

## i18n

- UI completa em PT-BR e EN.
- Nenhuma chave quebrada nas telas principais.
