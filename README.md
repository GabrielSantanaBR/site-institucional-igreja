# vinext-starter

## Projeto PIBRG

Site público da Primeira Igreja Batista Renovada em Guadalupe. O conteúdo variável
é administrado em `/acesso-interno`: a secretaria pode atualizar agenda, liderança
e devocionais, enquanto a equipe de intercessão pode acompanhar pedidos de oração.
O acesso é autenticado e autorizado no servidor.

Os pedidos ficam criptografados no D1. A variável
`PRAYER_NOTIFICATION_EMAIL` define o destinatário temporário das notificações por
e-mail; as chaves reais de proteção permanecem apenas na hospedagem e nunca devem
ser adicionadas ao GitHub.

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

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
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Diagnostic Commands

- `npm run install:ci`: perform the one bounded lockfile install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build and validate the deployable Sites artifact
- `npm run start`: start the built Vinext application
- `npm test`: build, validate, and verify the rendered development-preview metadata
- `npm run validate:artifact`: recheck an existing artifact's manifest and ESM `default.fetch` export
- `npm run db:generate`: generate Drizzle migrations after schema changes

Use build and validation commands for targeted diagnosis after a remote failure, not as part of the normal checkpoint path.

The timeout defaults can be overridden for a controlled canary with `SITES_INSTALL_TIMEOUT`, `SITES_INSTALL_KILL_AFTER`, `SITES_BUILD_TIMEOUT`, and `SITES_BUILD_KILL_AFTER`. A timeout fails the command; the helpers never retry an unchanged install or build.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

## Anúncios genéricos e configurações

Em **Informações gerais → Anúncios no site**, marque os formatos desejados e
use **Salvar informações gerais**. Os três modelos começam desligados:

- **Faixa inferior:** fechável; o fechamento dura a sessão da aba. Não cobre os
  formulários de contato e oração e é ocultada quando o chat ou menu está aberto.
- **Lateral adaptável:** fixa apenas em telas a partir de 1600 px; em telas menores,
  aparece no fluxo da página antes do rodapé.
- **Banner no conteúdo:** bloco antes do rodapé, sem sobreposição.

As prévias são genéricas e não são anúncios de uma rede de publicidade: não geram
receita, não aceitam scripts externos e não coletam métricas. Uma operação comercial
real exige cadastrar anunciantes ou integrar uma rede em uma etapa posterior.
Não são exibidas na administração. Nenhuma migração é necessária: as chaves
`adBottomEnabled`, `adSideEnabled` e `adInlineEnabled` usam `site_settings`.
O valor válido é a string `true` ou `false`; campos omitidos em um salvamento são
preservados. Escritas concorrentes usam revisão transacional e retornam HTTP 409
quando o formulário está desatualizado. O painel exige nova leitura após conflito.

### Verificação para desenvolvimento

- `npm run typecheck`: checagem TypeScript com tipos do Worker.
- `npm run lint`: análise estática.
- `npm test`: build e testes existentes, testes funcionais de configurações em
  SQLite isolado e testes DOM dos anúncios/controles (sem dados de produção).

Os testes funcionais substituem apenas a identidade e o binding do banco. Eles
executam as validações reais da API e o SQL das migrações. Não substituem um teste
com credenciais e armazenamento na hospedagem publicada.

## Instalação independente no Railway

A aplicação também roda em Next.js nativo sobre Node 24, sem gateway de identidade
ChatGPT. O Dockerfile compila `npm run build:railway` e inicia o servidor standalone.
Configure um volume persistente em `/data` e mantenha **uma réplica**. Não remova o
volume: ele contém `pibrg.sqlite`, suas cópias e `media/`. Este desenho não permite
escalar a aplicação horizontalmente; para isso, migre o banco e os arquivos para
serviços compartilhados antes de adicionar réplicas.

Variáveis obrigatórias: `APP_RUNTIME=node`, `DATA_DIR=/data`, `ADMIN_USERNAME`,
`ADMIN_PASSWORD` (16 caracteres ou mais), `ADMIN_SESSION_SECRET` (32 ou mais),
`IP_HASH_SALT`, `PRAYER_ENCRYPTION_KEY` (32 bytes em base64), `PUBLIC_SITE_URL` e
`PORT=3000`. Defina `SITE_STAGE=staging` enquanto a instalação for de testes.
As chaves permanecem apenas nas variáveis do Railway. Credenciais de contas da equipe
são hashes scrypt; exclusão, bloqueio e troca de senha revogam os acessos anteriores.
Cabeçalhos de identidade do ChatGPT são ignorados fora do Sites.

As migrações são aplicadas uma vez no volume ao abrir o banco, com hash de integridade
e transações. As fotos são gravadas atomicamente em diretório privado e servidas apenas
pelo endpoint de mídia. O healthcheck `/api/health` testa a leitura do banco.
Antes de cada reinício e a cada 24 horas, são criados snapshots consistentes do SQLite,
com retenção dos sete mais recentes. São cópias no mesmo volume: protegem contra erros
operacionais, mas não substituem backups externos nem um plano de recuperação do volume.

E-mail é opcional para armazenamento: configure `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`,
`PRAYER_NOTIFICATION_EMAIL` e `CONTACT_NOTIFICATION_EMAIL` para ativar notificações.
Mensagens continuam salvas no painel quando o envio de e-mail não está configurado.

### Testes e recuperação

- `npm run build:railway` e `node scripts/qa-railway.mjs --local`: testes ponta a ponta
  HTTP com credenciais e dados temporários, sem acessar bancos existentes.
- `scripts/qa-railway.mjs` também aceita JSON `{base,username,password}` por stdin
  para testes na instalação dedicada. Não use credenciais em argumentos de shell.
- `scripts/recover-public.mjs` extrai somente objetos JSON presentes em capturas HTML
  públicas de Vinext, sem executar código vindo do site. Não recupera dados privados.

O Worker `pibrg-guadalupe` existente é um proxy para o Site antigo. Ele não precisa
ser alterado durante a validação da instalação Railway. Dados privados, usuários,
configurações ocultas e imagens não públicas não são migrados automaticamente do Site.
