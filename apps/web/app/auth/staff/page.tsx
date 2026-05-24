import Link from "next/link";

export default function StaffLoginPage() {
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
      {/* TODO: wire Better Auth signIn("credentials") */}
      <form action="#" method="POST" noValidate>
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

        {/* Submit button */}
        <button
          type="submit"
          className="w-full rounded-xl py-3 px-6 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "var(--color-on-primary)",
          }}
          aria-label="Sign in as staff"
        >
          Sign in
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
