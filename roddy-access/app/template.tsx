// Re-mounts on every navigation, giving each page a quiet fade in.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page">{children}</div>;
}
