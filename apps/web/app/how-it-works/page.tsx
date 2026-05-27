import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Landmark, Shield, Users } from "lucide-react";

export const metadata = {
  title: "How Ember works",
  description:
    "Funds go into a smart contract. They come out when creators deliver. Here is the full mechanics.",
};

export default function HowItWorksPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-background py-16">
        <Container>
          <nav aria-label="Breadcrumb">
            <Link
              href="/"
              className="text-label-md text-primary hover:underline"
            >
              &larr; Back to Ember
            </Link>
          </nav>
          <h1 className="text-display-md text-on-surface mt-6">
            How Ember works
          </h1>
          <p className="text-body-lg text-on-surface-variant mt-4 max-w-2xl">
            Funds go into a smart contract. They come out when creators deliver.
            Here is the full mechanics.
          </p>
        </Container>
      </section>

      {/* Section 1: The funding lifecycle */}
      <section className="bg-surface-container-low py-16">
        <Container>
          <h2 className="text-headline-lg text-on-surface">
            The funding lifecycle
          </h2>
          <p className="text-body-md text-on-surface-variant mt-2 max-w-2xl">
            Every Ember project follows the same cycle. The smart contract
            enforces it.
          </p>

          <ol className="mt-10 flex flex-col gap-10">
            {/* Step 1 */}
            <li className="flex gap-6">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-md font-bold"
                aria-hidden="true"
              >
                1
              </div>
              <div>
                <h3 className="text-headline-md text-on-surface">
                  A backer pledges USDT
                </h3>
                <p className="text-body-md text-on-surface-variant mt-2">
                  Funds move from your wallet directly into an escrow contract
                  on Morph L2. Ember never holds your money. The creator cannot
                  access it yet.
                </p>
              </div>
            </li>

            {/* Step 2 */}
            <li className="flex gap-6">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-md font-bold"
                aria-hidden="true"
              >
                2
              </div>
              <div>
                <h3 className="text-headline-md text-on-surface">
                  Escrow holds the funds
                </h3>
                <p className="text-body-md text-on-surface-variant mt-2">
                  The contract holds USDT until milestones are verified. Each
                  milestone has a pre-agreed share of the total funding (in
                  basis points).
                </p>
              </div>
            </li>

            {/* Step 3 */}
            <li className="flex gap-6">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-md font-bold"
                aria-hidden="true"
              >
                3
              </div>
              <div>
                <h3 className="text-headline-md text-on-surface">
                  The org submits evidence
                </h3>
                <p className="text-body-md text-on-surface-variant mt-2">
                  When a milestone is done, the org owner submits a URI with the
                  evidence. This triggers a voting period (between 3 and 30
                  days).
                </p>
              </div>
            </li>

            {/* Step 4 */}
            <li className="flex gap-6">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-md font-bold"
                aria-hidden="true"
              >
                4
              </div>
              <div>
                <h3 className="text-headline-md text-on-surface">
                  Backers vote to approve or reject
                </h3>
                <p className="text-body-md text-on-surface-variant mt-2">
                  Any wallet that contributed to the project can vote YES or NO.
                  Votes are weighted by contribution size.
                </p>
              </div>
            </li>

            {/* Step 5 */}
            <li className="flex gap-6">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-md font-bold"
                aria-hidden="true"
              >
                5
              </div>
              <div>
                <h3 className="text-headline-md text-on-surface">
                  Funds release — or return
                </h3>
                <p className="text-body-md text-on-surface-variant mt-2">
                  If the milestone passes, the org can claim that milestone's
                  share of the escrow. If it fails, backers can withdraw their
                  proportional share.
                </p>
              </div>
            </li>
          </ol>
        </Container>
      </section>

      {/* Section 2: Smart contract explainer */}
      <section className="bg-background py-16">
        <Container>
          <h2 className="text-headline-lg text-on-surface">
            Built on the contract, not on trust
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            {/* Card 1 */}
            <Card>
              <Landmark className="text-primary" size={32} aria-hidden="true" />
              <h3 className="text-headline-md text-on-surface mt-4">
                ProjectEscrow
              </h3>
              <p className="text-body-md text-on-surface-variant mt-2">
                Each project deploys a dedicated escrow contract. Funds are
                isolated per project. One project&apos;s failure cannot affect
                another.
              </p>
            </Card>

            {/* Card 2 */}
            <Card>
              <Shield className="text-primary" size={32} aria-hidden="true" />
              <h3 className="text-headline-md text-on-surface mt-4">
                Non-custodial
              </h3>
              <p className="text-body-md text-on-surface-variant mt-2">
                Neither Ember nor the org owner can unilaterally withdraw funds.
                Only milestone-weighted claims are possible after a vote passes.
              </p>
            </Card>

            {/* Card 3 */}
            <Card>
              <Users className="text-primary" size={32} aria-hidden="true" />
              <h3 className="text-headline-md text-on-surface mt-4">
                Backer-governed
              </h3>
              <p className="text-body-md text-on-surface-variant mt-2">
                Milestone votes are backer-only. The voting window is set at
                project creation and cannot be changed once live.
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* Section 3: FAQ */}
      <section className="bg-surface-container-low py-16">
        <Container>
          <h2 className="text-headline-lg text-on-surface">
            Common questions
          </h2>

          <dl className="mt-10 flex flex-col gap-8 max-w-3xl">
            <div>
              <dt className="text-headline-md text-on-surface">
                What happens if a milestone fails?
              </dt>
              <dd className="text-body-md text-on-surface-variant mt-2">
                Backers who voted NO — or who did not vote — can withdraw their
                share of that milestone&apos;s allocation after the vote closes.
              </dd>
            </div>

            <div>
              <dt className="text-headline-md text-on-surface">
                Can the org cancel a project?
              </dt>
              <dd className="text-body-md text-on-surface-variant mt-2">
                Only a Super Admin can cancel a live project. The org cannot
                unilaterally cancel once contributions have been made.
              </dd>
            </div>

            <div>
              <dt className="text-headline-md text-on-surface">
                What is a basis point?
              </dt>
              <dd className="text-body-md text-on-surface-variant mt-2">
                A basis point (bps) is 1/100th of a percent. A milestone with
                2500 bps gets 25% of the raised funds. All milestones must sum
                to 10,000 bps.
              </dd>
            </div>

            <div>
              <dt className="text-headline-md text-on-surface">
                What currency does Ember use?
              </dt>
              <dd className="text-body-md text-on-surface-variant mt-2">
                USDT on Morph L2. No volatility from platform tokens. No
                lockups.
              </dd>
            </div>

            <div>
              <dt className="text-headline-md text-on-surface">
                Is Ember audited?
              </dt>
              <dd className="text-body-md text-on-surface-variant mt-2">
                The contracts are designed for formal audit. Audit status is
                shown on the project pages.
              </dd>
            </div>
          </dl>
        </Container>
      </section>

      {/* Section 4: CTA */}
      <section className="bg-primary py-16">
        <Container className="text-center">
          <h2 className="text-headline-lg text-on-primary">
            Ready to back a project?
          </h2>
          <p className="text-body-lg text-on-primary/80 mt-4">
            Browse live projects and back the ones that matter to you.
          </p>
          <div className="mt-8">
            <Button
              variant="outline"
              asChild
              className="border-on-primary text-on-primary hover:bg-primary-fixed"
            >
              <Link href="/projects">Browse projects</Link>
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
