import { redirect } from "next/navigation";
import { db } from "@/db";
import { hasAnyUser } from "@/server/agency";
import { getCurrentUser } from "@/server/session";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  if (!(await hasAnyUser(db))) redirect("/setup");
  return <LoginForm />;
}
