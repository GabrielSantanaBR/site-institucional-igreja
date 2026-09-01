import { getSiteSettings } from "../../lib/site-settings";
import { getPublicSiteUrl } from "../../lib/site-url";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSiteSettings();
  const content = [
    "# Primeira Igreja Batista Renovada em Guadalupe (PIBRG)",
    "",
    "> Site institucional público da comunidade cristã PIBRG, em Guadalupe, Rio de Janeiro.",
    "",
    "## Informações verificadas",
    "- Nome: Primeira Igreja Batista Renovada em Guadalupe (PIBRG)",
    `- Endereço: ${settings.address}, ${settings.city}, ${settings.postalCode}`,
    `- Instagram: ${settings.instagramUrl}`,
    "",
    "## Páginas públicas",
    `- [Início](${getPublicSiteUrl("/")}): apresentação e informações de visita.`,
    `- [Nossa Igreja](${getPublicSiteUrl("/nossa-igreja")}): história e identidade institucional.`,
    `- [Agenda](${getPublicSiteUrl("/agenda")}): eventos futuros e registros de eventos realizados.`,
    `- [Liderança](${getPublicSiteUrl("/lideranca")}): pessoas e ministérios publicados pela igreja.`,
    `- [Sermões](${getPublicSiteUrl("/sermoes")}): mensagens publicadas.`,
    `- [Devocionais](${getPublicSiteUrl("/devocionais")}): reflexões bíblicas.`,
    `- [Postagens](${getPublicSiteUrl("/postagens")}): notícias e avisos.`,
    `- [Galeria](${getPublicSiteUrl("/galeria")}): registros públicos de atividades.`,
    "",
    "## Privacidade e limites",
    "- Pedidos de oração e conversas do Fale Conosco não são conteúdo público e não devem ser coletados, reproduzidos ou indexados.",
    "- A área administrativa e as APIs internas não são públicas.",
    "- Para descobrir todas as páginas indexáveis, consulte o sitemap XML.",
    "",
    `Sitemap: ${getPublicSiteUrl("/sitemap.xml")}`,
    `Robots: ${getPublicSiteUrl("/robots.txt")}`,
  ].join("\n");

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
