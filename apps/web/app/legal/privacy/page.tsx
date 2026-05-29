import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Ember",
  description: "Privacy Policy for the Ember crowdfunding platform.",
};

export default function PrivacyPage() {
  return (
    <article>
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/" className="text-label-md text-primary hover:underline">
          &larr; Back to Ember
        </Link>
      </nav>

      <h1 className="text-display-sm text-on-surface">Privacy Policy</h1>
      <p className="text-label-sm text-on-surface-variant mt-2">
        Last updated: May 2026
      </p>

      <section className="mt-10">
        <h2 className="text-headline-md text-on-surface">
          1. Information We Collect
        </h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          When you use Ember, we collect:
        </p>
        <ul className="list-disc list-inside text-body-md text-on-surface-variant mt-3 space-y-1">
          <li>
            <strong className="text-on-surface">Account data</strong> — your
            name and email address provided via Google OAuth.
          </li>
          <li>
            <strong className="text-on-surface">Wallet addresses</strong> —
            public wallet addresses you link via SIWE.
          </li>
          <li>
            <strong className="text-on-surface">Usage data</strong> — IP
            address, browser user agent, and action timestamps for security and
            audit purposes.
          </li>
          <li>
            <strong className="text-on-surface">Onchain data</strong> —
            contribution amounts, votes, and NFT positions are publicly visible
            on Morph L2 and are indexed into our database for display.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">
          2. How We Use Your Information
        </h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          We use collected data to authenticate your account, send transactional
          emails, display your contribution history and voting activity, and
          maintain an audit trail for platform integrity.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">3. Data Sharing</h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          We do not sell your personal data. We share data only with{" "}
          <strong className="text-on-surface">Resend</strong> (email delivery),{" "}
          <strong className="text-on-surface">Railway</strong> (hosting and
          database), and <strong className="text-on-surface">Google</strong>{" "}
          (OAuth authentication only).
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">4. Onchain Data</h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          Contributions and votes are recorded permanently on Morph L2 and are
          publicly accessible. We cannot delete or modify this data.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">
          5. Email Preferences
        </h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          You can manage your email notification preferences from your{" "}
          <Link
            href="/dashboard/settings"
            className="text-primary hover:underline"
          >
            dashboard settings
          </Link>
          . Transactional emails related to active votes and contributions
          cannot be disabled.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">6. Data Retention</h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          Account data is retained for the lifetime of your account. Activity
          logs are retained indefinitely for platform audit purposes.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">7. Security</h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          We use industry-standard security practices including bcrypt password
          hashing, SIWE nonce verification, rate limiting, and strict CSP
          headers. We do not log sensitive credentials.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">8. Contact</h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          For privacy questions or deletion requests, reach out via the platform
          or visit{" "}
          <Link href="/about" className="text-primary hover:underline">
            our About page
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
