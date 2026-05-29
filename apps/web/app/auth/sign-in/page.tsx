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

      {/* Demo accounts helper */}
      <div
        className="mt-8 rounded-xl border p-4 text-sm"
        style={{
          borderColor: "var(--color-outline-variant)",
          backgroundColor: "var(--color-surface-container-low)",
          color: "var(--color-on-surface-variant)",
        }}
      >
        <p
          className="font-semibold mb-2"
          style={{ color: "var(--color-on-surface)" }}
        >
          Demo Accounts
        </p>
        <ul className="space-y-1">
          <li>
            <span style={{ color: "var(--color-on-surface)" }}>Super Admin:</span>{" "}
            <code>admin@ember.example</code>
          </li>
          <li>
            <span style={{ color: "var(--color-on-surface)" }}>Org Owner:</span>{" "}
            <code>owner@ember.example</code>
          </li>
          <li>
            <span style={{ color: "var(--color-on-surface)" }}>Demo Org:</span>{" "}
            Demo Organization (demo-org)
          </li>
          <li>
            <span style={{ color: "var(--color-on-surface)" }}>Backer:</span>{" "}
            <code>backer@ember.example</code>
          </li>
        </ul>
        <p className="mt-3">
          <span style={{ color: "var(--color-on-surface)" }}>All Passwords:</span>{" "}
          <code>ChangeMeOnFirstLogin!</code>
        </p>
      </div>

      {/* Mock USDT highlight */}
      <div
        className="mt-4 rounded-xl border-l-4 p-4 text-sm"
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
