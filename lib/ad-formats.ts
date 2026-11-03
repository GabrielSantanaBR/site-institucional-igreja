export const adFormats = [
  { key: "adBottomEnabled", id: "bottom", title: "Faixa inferior fechável", description: "Faixa compacta na base da tela, com botão de fechar. Não aparece nos formulários de contato e oração." },
  { key: "adSideEnabled", id: "side", title: "Lateral adaptável", description: "Painel lateral em telas largas. No celular, vira um bloco antes do rodapé, sem cobrir o conteúdo." },
  { key: "adInlineEnabled", id: "inline", title: "Banner no conteúdo", description: "Faixa antes do rodapé, integrada à página. Não interrompe a leitura." },
] as const;
export type AdFormat = (typeof adFormats)[number]["id"];
export type AdKey = (typeof adFormats)[number]["key"];
export function adIsEnabled(value: unknown) { return value === "true"; }
