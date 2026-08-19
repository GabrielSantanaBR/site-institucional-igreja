# Institutional Website Template

Template full-stack de site institucional para pequenas empresas, organizações, associações e projetos. Esta versão foi adaptada de um projeto real e remove nomes, endereços, identidade visual e regras específicas do cliente original.

O conteúdo variável pode ser administrado em `/acesso-interno`, permitindo que uma equipe autorizada atualize agenda, equipe, publicações e outros conteúdos sem editar o código-fonte. O acesso administrativo é autenticado e autorizado no servidor.

## Recursos demonstrados

- Página inicial institucional responsiva.
- Navegação desktop e mobile.
- Página de apresentação da organização.
- Equipe/liderança.
- Agenda e eventos.
- Conteúdos e publicações.
- Galeria.
- Área de contato.
- Área administrativa protegida.
- Persistência com Cloudflare D1.
- Estrutura preparada para deploy em Cloudflare.

## Stack

- Next.js / Vinext
- React
- TypeScript
- Cloudflare Workers
- Cloudflare D1
- Drizzle

## Prerequisites

- Node.js `>=22.13.0`
- Linux with `flock`, `curl`, and GNU `timeout`

## Sites Lifecycle

The Sites lifecycle CLI runs the locked dependency install before returning this checkout. Edit the source under `app/`, then checkpoint when a coherent milestone is ready to inspect or share. The remote Sites builder runs `npm run build` against the pushed commit. Do not repeat install or build as a normal pre-checkpoint step.

This starter does not use `wrangler.jsonc`.

`install:ci` is intentionally a single, non-retrying `npm ci`. It refuses a concurrent install for the same project, consumes a matching image-seeded npm cache with `--prefer-offline` while retaining registry fallback for a missing cache object, otherwise downloads and verifies the complete vinext tarball recorded in `package-lock.json`, limits npm to one socket, and terminates a stalled install. `build` applies a short timeout and then validates the Sites artifact. These helpers target Linux and use GNU `timeout`; they are not native macOS scripts.

Scripts that need writable project-scoped home, npm, XDG, and temporary paths use `scripts/sites-env.sh`. The `dev` and `start` scripts honor the caller's runtime environment and keep Wrangler logs inside the checkout. The generated `.sites-runtime/` directory is disposable and ignored by Git.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` contains the application schema
- `drizzle.config.ts` supports local migration generation when needed

## Diagnostic Commands

- `npm run install:ci`
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm test`
- `npm run validate:artifact`
- `npm run db:generate`

## Portfolio

O objetivo desta branch é demonstrar desenvolvimento de um site institucional realista, com front-end responsivo, conteúdo gerenciável, autenticação, persistência e deploy em infraestrutura serverless, sem expor identidade ou dados do cliente que originou o projeto.
