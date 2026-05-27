'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth/client";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (signInError) {
      setError(signInError.message ?? "Invalid email or password");
      return;
    }
    router.push("/admin");
  }

  return (
    <>
      {/* Heading */}
      <div className="mb-8">
        <h1
          className="text-2xl font-semibold mb-2"
          style={{
            color: "var(--color-on-surface)",
            letterSpacing: "-0.01em",
            lineHeight: "32px",
          }}
        >
          Staff Login
        </h1>
        <p
          className="text-sm leading-5"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          This is for Ember administrators only.
        </p>
      </div>

      {/* Staff credentials form */}
      <form onSubmit={(e) => { void handleSubmit(e); }} noValidate>
        {/* Email field */}
        <div className="mb-5">
          <label
            htmlFor="staff-email"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--color-on-surface)" }}
          >
            Email address
          </label>
          <input
            id="staff-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); }}
            placeholder="you@ember.xyz"
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2"
            style={{
              backgroundColor: "var(--color-surface-container-low)",
              color: "var(--color-on-surface)",
              border: "1px solid var(--color-outline)",
              // @ts-expect-error CSS custom property used as focus ring color via inline style workaround
              "--tw-ring-color": "var(--color-primary)",
            }}
            aria-required="true"
            aria-describedby="staff-email-hint"
          />
          <p
            id="staff-email-hint"
            className="sr-only"
          >
            Enter your administrator email address
          </p>
        </div>

        {/* Password field */}
        <div className="mb-6">
          <label
            htmlFor="staff-password"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--color-on-surface)" }}
          >
            Password
          </label>
          <input
            id="staff-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => { setPassword(e.target.value); }}
            placeholder="••••••••"
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-shadow focus:ring-2"
            style={{
              backgroundColor: "var(--color-surface-container-low)",
              color: "var(--color-on-surface)",
              border: "1px solid var(--color-outline)",
              // @ts-expect-error CSS custom property used as focus ring color via inline style workaround
              "--tw-ring-color": "var(--color-primary)",
            }}
            aria-required="true"
          />
        </div>

        {error && (
          <p
            className="mb-4 text-sm rounded-lg px-3 py-2"
            role="alert"
            style={{
              color: "var(--color-error)",
              backgroundColor: "var(--color-error-container)",
            }}
          >
            {error}
          </p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl py-3 px-6 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-on-primary)",
          }}
          aria-label="Sign in as staff"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {/* Back link */}
      <p
        className="mt-8 text-center text-sm"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        <Link
          href="/auth/sign-in"
          className="font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-sm"
          style={{ color: "var(--color-on-surface-variant)" }}
          aria-label="Back to regular sign-in"
        >
          Back to sign-in
        </Link>
      </p>
    </>
  );
}
