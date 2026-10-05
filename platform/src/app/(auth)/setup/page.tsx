import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/db";
import { hasAnyUser } from "@/server/agency";
import { SetupForm } from "./setup-form";

export const metadata = { title: "Set up your agency" };

export default async function SetupPage() {
  await connection(); // must check the database on every request, not at build time
  if (await hasAnyUser(db)) redirect("/login");
  return <SetupForm />;
}
