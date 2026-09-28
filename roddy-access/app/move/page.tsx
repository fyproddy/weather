import type { Metadata } from "next";
import PillarPage from "@/components/PillarPage";
import { getPillar } from "@/content/pillars";

const p = getPillar("move");

export const metadata: Metadata = {
  title: p.metaTitle,
  description: p.metaDescription,
  alternates: { canonical: "/move/" },
};

export default function MovePage() {
  return <PillarPage slug="move" />;
}
