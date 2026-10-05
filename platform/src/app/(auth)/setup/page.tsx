import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/db";
import { hasAnyUser } from "@/server/agency";
import { setupCodeStatus } from "@/server/setup-code";
import { SetupForm } from "./setup-form";

export const metadata = { title: "Set up your agency" };

export default async function SetupPage() {
  await connection(); // must check the database on every request, not at build time
  if (await hasAnyUser(db)) redirect("/login");
  const code = setupCodeStatus();
  if (code === "missing") {
    return (
      <div className="rounded-xl border border-warn/30 bg-warn-soft p-5 text-sm text-warn">
        Setup is locked. Add a <strong>SETUP_CODE</strong> variable on the server (any secret phrase you choose), redeploy, then reload this
        page.
      </div>
    );
  }
  return <SetupForm needsCode={code === "required"} />;
}
