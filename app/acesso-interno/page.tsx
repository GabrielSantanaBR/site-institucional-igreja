import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function InternalAccessPage() {
  redirect("/alteracao-de-dados");
}
