import type { Metadata } from "next";
import { getAdminIdentity } from "../../lib/internal-auth";
import { AdminLogin } from "../components/AdminLogin";
import { InternalDashboard } from "../components/InternalDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Administração",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminPage() {
  const identity = await getAdminIdentity();
  if (!identity) return <AdminLogin />;
  return <InternalDashboard identity={identity} signOutPath="/api/internal/logout" />;
}
