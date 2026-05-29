'use client';

import Link from "next/link";

export default function SignInPage() {
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
          Welcome back.
        </h1>
        <p
          className="text-sm leading-5"
          style={{ color: "var(--color-on-surface-variant)" }}
        >
          Sign in to fund the future, one milestone at a time.
        </p>
      </div>

      {/* Email & password login link */}
      <div className="text-center">
        <Link
          href="/auth/staff"
          className="inline-flex w-full items-center justify-center rounded-xl py-3 px-6 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-on-primary)",
          }}
        >
          Login with email and password
        </Link>
      </div>

      {/* Mock USDT highlight */}
      <div
        className="mt-8 rounded-xl border-l-4 p-4 text-sm"
        style={{
          borderColor: "var(--color-primary)",
          backgroundColor: "var(--color-primary-container)",
          color: "var(--color-on-primary-container)",
        }}
      >
        <p className="font-semibold mb-1">
          ⚡ You need Mock USDT to test funding or backing a project.
        </p>
        <p>
          See the complete process of getting Mock USDT{" "}
          <a
            href="https://github.com/webnxt-2030/ember2#-funding-your-wallet-with-mock-usdt-morph-hoodi-testnet"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-sm"
          >
            in this guide
          </a>
          .
        </p>
      </div>
    </>
  );
}
