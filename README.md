# Site institucional PIBRG

Site da Primeira Igreja Batista Renovada em Guadalupe, com edição de conteúdo,
agenda, galeria, atendimento e pedidos de oração. O visual existente foi preservado.

## Desenvolvimento e execução

- Node 24 e dependências de `package-lock.json`: `npm ci`.
- `npm run dev`: servidor Next.js local; configure as variáveis descritas abaixo.
- `npm run build`: build de produção Next.js para Railway.
- `npm start`: servidor de produção, com `APP_RUNTIME=node` e as variáveis obrigatórias.
- `npm run typecheck` e `npm run lint`: verificações estáticas.
- `node --test tests/*.test.mjs`: testes de API, anúncios e armazenamento isolado.
- `npm test`: build de produção seguido dos testes.

O Dockerfile é o caminho de publicação no Railway. Os arquivos Vinext, as declarações
em `.openai/hosting.json` e `build:cloudflare` são o legado da hospedagem Sites;
essa integração não é o alvo de publicação desta versão e precisa de validação própria.

## Acesso e proteção

O painel fica em `/acesso-interno`. O administrador inicial usa as variáveis
`ADMIN_USERNAME` e `ADMIN_PASSWORD`; a equipe usa e-mail e senha definidos no painel.
Permissões e bloqueios são verificados no servidor. Pedidos e conversas são
criptografados no banco. Nunca versione senhas, chaves, bancos nem capturas privadas.

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

A aplicação roda em Next.js nativo sobre Node 24, sem gateway de identidade
ChatGPT. O Dockerfile compila `npm run build:railway` e inicia o servidor standalone.
Configure um volume persistente em `/data` e mantenha **uma réplica**. Não remova o
volume: ele contém `pibrg.sqlite`, suas cópias e `media/`. Este desenho não permite
escalar a aplicação horizontalmente; para isso, migre o banco e os arquivos para
serviços compartilhados antes de adicionar réplicas.

Variáveis obrigatórias: `APP_RUNTIME=node`, `DATA_DIR=/data`, `ADMIN_USERNAME`,
`ADMIN_PASSWORD` (16 caracteres ou mais), `ADMIN_SESSION_SECRET` (32 ou mais),
`IP_HASH_SALT`, `PRAYER_ENCRYPTION_KEY` (32 bytes em base64), `PUBLIC_SITE_URL` e
`PORT=3000`. Defina `SITE_STAGE=staging` enquanto a instalação for de testes.
As chaves de execução permanecem nas variáveis do Railway. Credenciais de contas da equipe
são hashes scrypt; exclusão, bloqueio e troca de senha revogam os acessos anteriores.
Cabeçalhos de identidade do ChatGPT são ignorados fora do Sites.

As migrações são aplicadas uma vez no volume ao abrir o banco, com hash de integridade
e transações. As fotos são gravadas atomicamente em diretório privado e servidas apenas
pelo endpoint de mídia. O healthcheck `/api/health` testa a leitura do banco.
Na inicialização e a cada 24 horas, são criados snapshots consistentes do SQLite,
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
- `scripts/import-public.mjs` importa a captura pública em uma instalação vazia,
  incluindo as imagens acessíveis. Aceita o mesmo JSON por stdin; recusa sobrescrever
  conteúdo existente. A captura fica em `qa/public-backup/recovered.json` e não é
  versionada, assim como as credenciais usadas nos testes.
- `scripts/recover-public.mjs` extrai somente objetos JSON presentes em capturas HTML
  públicas de Vinext, sem executar código vindo do site. Não recupera dados privados.

O Worker `pibrg-guadalupe` existente é um proxy para o Site antigo. Ele não precisa
ser alterado durante a validação da instalação Railway. Dados privados, usuários,
configurações ocultas e imagens não públicas não são migrados automaticamente do Site.
