"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setSubmitting(false);

    if (result?.error) {
      setError("Giriş başarısız. Email ve şifreyi kontrol edin.");
      return;
    }

    if (result?.ok) {
      window.location.href = "/materials";
    }
  };

  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: 24 }}>
      <h1>GlassOS Login</h1>
      <p>GlassOS’a erişmek için kullanıcı bilgilerinizi girin.</p>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button type="submit" disabled={submitting}>
          {submitting ? "Giriş yapılıyor..." : "Sign in"}
        </button>
        {error && <div style={{ color: "red" }}>{error}</div>}
      </form>
      <p style={{ marginTop: 16 }}>
        <Link href="/dashboard">Go to dashboard placeholder</Link>
      </p>
    </main>
  );
}
