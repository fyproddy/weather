import type { Metadata } from "next";
import PillarPage from "@/components/PillarPage";
import { getPillar } from "@/content/pillars";

const p = getPillar("night");

export const metadata: Metadata = {
  title: p.metaTitle,
  description: p.metaDescription,
  alternates: { canonical: "/night/" },
};

export default function NightPage() {
  return <PillarPage slug="night" />;
}
