export default function Wordmark({ stacked = false, className = "" }: { stacked?: boolean; className?: string }) {
  return (
    <span className={`wordmark ${stacked ? "wordmark--stacked" : ""} ${className}`} aria-label="RODDY ACCESS">
      <span className="wordmark__a" aria-hidden="true">RODDY</span>
      <span className="wordmark__b" aria-hidden="true">ACCESS</span>
    </span>
  );
}
