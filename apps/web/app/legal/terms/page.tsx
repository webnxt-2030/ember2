import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Ember",
  description: "Terms of Service for the Ember crowdfunding platform.",
};

export default function TermsPage() {
  return (
    <article>
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link href="/" className="text-label-md text-primary hover:underline">
          &larr; Back to Ember
        </Link>
      </nav>

      <h1 className="text-display-sm text-on-surface">Terms of Service</h1>
      <p className="text-label-sm text-on-surface-variant mt-2">
        Last updated: May 2026
      </p>

      <section className="mt-10">
        <h2 className="text-headline-md text-on-surface">1. Acceptance</h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          By accessing or using Ember (&quot;the Platform&quot;), you agree to
          be bound by these Terms of Service. If you do not agree, do not use
          the Platform.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">
          2. Nature of the Platform
        </h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          Ember is a non-custodial, milestone-based crowdfunding interface that
          interacts with smart contracts deployed on Morph L2. Ember does not
          hold, control, or have access to any funds. All contributions are
          processed directly between your wallet and the relevant{" "}
          <code>ProjectEscrow</code> smart contract.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">3. Eligibility</h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          You must be at least 18 years old and legally permitted to use
          blockchain-based financial services in your jurisdiction to use the
          Platform.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">
          4. Wallet &amp; Account Responsibility
        </h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          You are solely responsible for the security of your wallet private
          keys and your account credentials. Ember cannot recover lost keys or
          reverse onchain transactions.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">
          5. Smart Contract Risk
        </h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          Smart contracts may contain bugs. While Ember&apos;s contracts are
          designed to be audited and follow security best practices, no software
          is entirely risk-free. Use the Platform at your own risk.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">
          6. Organization Verification
        </h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          Organizations are manually reviewed and verified by Ember Super
          Admins. Verification is not a guarantee of project success or the
          accuracy of any claims made by the organization.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">
          7. Prohibited Conduct
        </h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          You may not use the Platform to: violate any law or regulation;
          misrepresent your identity or organization; submit fraudulent
          milestones; or attempt to exploit the smart contracts.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">
          8. Limitation of Liability
        </h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          To the maximum extent permitted by law, Ember and its operators shall
          not be liable for any indirect, incidental, or consequential damages
          arising from your use of the Platform or any smart contract
          interactions.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">9. Changes</h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          We may update these Terms from time to time. Continued use of the
          Platform after changes constitutes acceptance of the new Terms.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-headline-md text-on-surface">10. Contact</h2>
        <p className="text-body-md text-on-surface-variant mt-3">
          Questions about these Terms? Reach out via the platform or visit{" "}
          <Link href="/about" className="text-primary hover:underline">
            our About page
          </Link>
          .
        </p>
      </section>
    </article>
  );
}
