'use client';

import Link from "next/link";
import { authClient } from "@/lib/auth/client";

export default function SignUpPage() {
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
          Join Ember.
        </h1>
        <p
          className="text-sm leading-5"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          Back projects you believe in. Funds release only when creators deliver.
        </p>
      </div>

      {/* Google sign-up button */}
      <button
        type="button"
        aria-label="Continue with Google"
        className="w-full flex items-center justify-center gap-3 rounded-xl py-3 px-6 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{
          backgroundColor: "var(--color-primary)",
          color: "var(--color-on-primary)",
        }}
        onClick={() => {
          void authClient.signIn.social({ provider: "google", callbackURL: "/projects" });
        }}
      >
        {/* Google "G" SVG icon */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="w-5 h-5 shrink-0"
          fill="currentColor"
        >
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </button>

      {/* Disclosure note */}
      <p
        className="mt-4 text-xs text-center leading-4"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        We use Google to verify your identity. No email or password required.
      </p>

      {/* Footer */}
      <p
        className="mt-8 text-center text-sm"
        style={{ color: "var(--color-on-surface-variant)" }}
      >
        Already have an account?{" "}
        <Link
          href="/auth/sign-in"
          className="font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-sm"
          style={{ color: "var(--color-on-surface)" }}
          aria-label="Sign in to Ember"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
