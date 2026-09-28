import Link from "next/link";

export default function NotFound() {
  return (
    <section className="wrap notfound">
      <p className="label muted">404</p>
      <h1 className="display">
        Not on <em>the list.</em>
      </h1>
      <div>
        <Link href="/" className="btn">
          Back to home
        </Link>
      </div>
    </section>
  );
}
