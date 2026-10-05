export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-xl font-bold tracking-tight">
            LeadPath <span className="text-accent">Growth</span>
          </div>
          <p className="mt-1 text-sm text-muted">Google growth platform for agencies</p>
        </div>
        {children}
      </div>
    </main>
  );
}
