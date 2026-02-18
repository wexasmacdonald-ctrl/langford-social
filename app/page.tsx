import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>Social Admin</h1>
      <p>
        Open the admin page at <Link href="/admin">/admin</Link>.
      </p>
    </main>
  );
}
