# Task Dependency Map

## Grafo simplificado

- T01 -> T02, T03, T04
- T03 + T04 -> T05
- T02 + T04 -> T06
- T02 + T06 -> T07
- T07 -> T08, T09, T10, T12, T14
- T07 + T08 -> T11
- T08 + T09 + T10 + T12 -> T13
- T07 + T14 -> T15
- T05 -> T16
- T07 + T16 -> T17
- T07 + T16 + T17 -> T18
- T08..T15 -> T19
- T19 -> T20

## Caminho critico (alto nivel)

T01 -> T02 -> T06 -> T07 -> (T08,T09,T10,T12,T14) -> (T13,T15) -> T19 -> T20
