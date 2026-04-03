# Site de Jogos

Base inicial do MVP multiplayer mobile-first descrito em `docs/`.

## Stack inicial

- `apps/web`: React + Vite para lobby, fluxo de entrada e UI mobile-first.
- `apps/server`: Fastify para REST e preparo do backend autoritativo.
- `packages/shared`: contratos e schemas compartilhados entre front e back.

## Scripts

- `pnpm install`
- `pnpm dev:web`
- `pnpm dev:server`
- `pnpm check`
- `pnpm build`
- `pnpm start`

## Deploy

- O backend agora pode servir o frontend compilado em producao.
- Para Coolify, aponte o projeto para este repositorio e use o `Dockerfile` da raiz.
- Para CD automatico via GitHub Actions, adicione o segredo `COOLIFY_DEPLOY_WEBHOOK` com a webhook de deploy da aplicacao no Coolify.

## Status

- Fase atual: `T13` concluida.
- Acompanhe o progresso em `docs/02-planning/implementation-status.md`.
