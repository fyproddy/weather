import type { Metadata } from "next";
import Planner from "@/components/Planner";

export const metadata: Metadata = {
  title: "Plan Your Experience",
  description:
    "Tell us what you're planning in Johannesburg — dates, group, occasion and what you need. We build your options around it.",
  alternates: { canonical: "/plan/" },
};

export default function PlanPage() {
  return <Planner />;
}
