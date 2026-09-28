import type { Metadata } from "next";
import PillarPage from "@/components/PillarPage";
import { getPillar } from "@/content/pillars";

const p = getPillar("stay");

export const metadata: Metadata = {
  title: p.metaTitle,
  description: p.metaDescription,
  alternates: { canonical: "/stay/" },
};

export default function StayPage() {
  return <PillarPage slug="stay" />;
}
