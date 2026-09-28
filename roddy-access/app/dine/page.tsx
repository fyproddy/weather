import type { Metadata } from "next";
import PillarPage from "@/components/PillarPage";
import { getPillar } from "@/content/pillars";

const p = getPillar("dine");

export const metadata: Metadata = {
  title: p.metaTitle,
  description: p.metaDescription,
  alternates: { canonical: "/dine/" },
};

export default function DinePage() {
  return <PillarPage slug="dine" />;
}
