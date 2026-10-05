import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState title="Page not found" action={<ButtonLink href="/">Back to dashboard</ButtonLink>}>
      It may have been removed, or it belongs to a different agency.
    </EmptyState>
  );
}
