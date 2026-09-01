import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default function InternalAccessPage() {
  // Alias legado removido: ele não deve revelar o endereço do painel.
  notFound();
}
