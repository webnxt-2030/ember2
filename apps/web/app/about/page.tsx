import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "About Ember",
  description:
    "Ember is a milestone-based, onchain crowdfunding platform on Morph L2 that keeps creators accountable through escrowed funds and backer voting.",
};

export default function AboutPage() {
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
          <h1 className="text-display-md text-on-surface mt-6">About Ember</h1>
          <p className="text-body-lg text-on-surface-variant mt-4 max-w-2xl">
            Ember is a milestone-based, onchain crowdfunding platform on Morph
            L2. Funds sit in a smart contract and are released to creators only
            when backers approve each milestone.
          </p>
        </Container>
      </section>

      {/* Mission */}
      <section className="bg-surface-container-low py-16">
        <Container>
          <h2 className="text-headline-lg text-on-surface">Our mission</h2>
          <p className="text-body-md text-on-surface-variant mt-4 max-w-3xl">
            Traditional crowdfunding gives creators all the money up front and
            trusts them to deliver. That trust is too often broken. Ember
            replaces that promise with a guarantee: funds are locked in an
            escrow contract and released incrementally as milestones are
            verified by the people who funded the project.
          </p>
          <p className="text-body-md text-on-surface-variant mt-4 max-w-3xl">
            No middlemen. No custodians. No way for a creator to disappear with
            your money.
          </p>
        </Container>
      </section>

      {/* How it works cards */}
      <section className="bg-background py-16">
        <Container>
          <h2 className="text-headline-lg text-on-surface">
            Built on accountability
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            <Card>
              <span
                className="material-symbols-outlined text-primary text-[2rem]"
                aria-hidden="true"
              >
                lock
              </span>
              <h3 className="text-headline-md text-on-surface mt-4">
                Escrowed funds
              </h3>
              <p className="text-body-md text-on-surface-variant mt-2">
                Every contribution goes directly into a per-project smart
                contract on Morph L2. Ember never touches your money.
              </p>
            </Card>

            <Card>
              <span
                className="material-symbols-outlined text-primary text-[2rem]"
                aria-hidden="true"
              >
                how_to_vote
              </span>
              <h3 className="text-headline-md text-on-surface mt-4">
                Backer voting
              </h3>
              <p className="text-body-md text-on-surface-variant mt-2">
                When an org submits a milestone for review, backers vote YES or
                NO. Votes are weighted by contribution size. A strict majority
                NO is required to block a release.
              </p>
            </Card>

            <Card>
              <span
                className="material-symbols-outlined text-primary text-[2rem]"
                aria-hidden="true"
              >
                token
              </span>
              <h3 className="text-headline-md text-on-surface mt-4">
                Position NFTs
              </h3>
              <p className="text-body-md text-on-surface-variant mt-2">
                Every contribution mints a Position NFT to your wallet. Your
                stake is onchain, portable, and inspectable by anyone.
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* Tech */}
      <section className="bg-surface-container-low py-16">
        <Container>
          <h2 className="text-headline-lg text-on-surface">Technology</h2>
          <p className="text-body-md text-on-surface-variant mt-4 max-w-3xl">
            Ember runs on{" "}
            <strong className="text-on-surface">Morph L2</strong> — an
            Ethereum-compatible Layer 2 designed for high-throughput payment
            applications. Contributions are settled in{" "}
            <strong className="text-on-surface">bridged USDT</strong>, so
            there&apos;s no price volatility from platform tokens or lockups.
          </p>
          <p className="text-body-md text-on-surface-variant mt-4 max-w-3xl">
            Smart contracts are written in Solidity with OpenZeppelin v5,
            designed for formal audit, and have no upgrade keys. A new project
            means a new, independent escrow — failures are isolated.
          </p>
        </Container>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16">
        <Container className="text-center">
          <h2 className="text-headline-lg text-on-primary">
            Back something real
          </h2>
          <p className="text-body-lg text-on-primary/80 mt-4 max-w-xl mx-auto">
            Browse live projects and put your USDT behind the ones that matter
            to you — with the guarantee that it only moves when creators
            deliver.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            <Button
              variant="outline"
              asChild
              className="border-on-primary text-on-primary hover:bg-primary-fixed"
            >
              <Link href="/projects">Browse projects</Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-on-primary text-on-primary hover:bg-primary-fixed"
            >
              <Link href="/how-it-works">How it works</Link>
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
