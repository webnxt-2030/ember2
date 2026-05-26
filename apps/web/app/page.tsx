import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusDot } from "@/components/ui/status-dot";

export default function HomePage() {
  return (
    <>
      {/* Section 1: Hero */}
      <section className="bg-background py-24">
        <Container>
          <div className="grid grid-cols-12 gap-8 items-center">
            {/* Left col */}
            <div className="col-span-12 lg:col-span-7">
              <p className="text-label-md text-on-surface-variant">
                Milestone Crowdfunding on Morph L2
              </p>
              <h1 className="text-display-lg text-on-surface mt-4">
                Fund the future, one milestone at a time.
              </h1>
              <p className="text-body-lg text-on-surface-variant mt-6">
                Ember releases funds as creators deliver — one milestone at a
                time. Not before.
              </p>
              <div className="flex flex-wrap gap-4 mt-8">
                <Button variant="primary-hero" asChild>
                  <Link href="/projects">Browse Projects</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/how-it-works">How it works</Link>
                </Button>
              </div>
            </div>

            {/* Right col: mock featured project card */}
            <div className="col-span-12 lg:col-span-5">
              <Card variant="featured">
                <div className="flex items-center gap-2 mb-4">
                  <StatusDot status="live" />
                  <span className="text-label-sm text-on-surface-variant">
                    Live
                  </span>
                </div>
                <h2 className="text-headline-md text-on-surface">
                  Community Fiber Network
                </h2>
                <p className="text-label-sm text-on-surface-variant mt-1">
                  Pacific Northwest Tech Collective
                </p>
                <div className="mt-6">
                  <Progress value={49} />
                  <p className="text-label-sm text-on-surface-variant mt-2">
                    49% funded — 3 of 5 milestones complete
                  </p>
                </div>
                <p className="text-label-sm text-on-surface-variant mt-4">
                  1,240 backers · 22 days left
                </p>
              </Card>
            </div>
          </div>
        </Container>
      </section>

      {/* Section 2: How it works */}
      <section className="bg-surface-container-low py-16">
        <Container>
          <h2 className="text-headline-lg text-on-surface">
            How Ember works
          </h2>
          <p className="text-body-md text-on-surface-variant mt-2">
            Three steps. No trust required.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            {/* Step 1 */}
            <div className="flex flex-col gap-4">
              <span
                className="material-symbols-outlined text-primary text-[2rem]"
                aria-hidden="true"
              >
                account_balance_wallet
              </span>
              <h3 className="text-headline-md text-on-surface">
                Back a project
              </h3>
              <p className="text-body-md text-on-surface-variant">
                Funds go directly into an escrow contract on Morph L2. The
                creator can&apos;t touch them until milestones are verified.
              </p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col gap-4">
              <span
                className="material-symbols-outlined text-primary text-[2rem]"
                aria-hidden="true"
              >
                flag
              </span>
              <h3 className="text-headline-md text-on-surface">
                Creators deliver
              </h3>
              <p className="text-body-md text-on-surface-variant">
                When a milestone is complete, the creator submits evidence.
                Backers vote to approve or reject.
              </p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col gap-4">
              <span
                className="material-symbols-outlined text-primary text-[2rem]"
                aria-hidden="true"
              >
                account_balance
              </span>
              <h3 className="text-headline-md text-on-surface">
                Funds release
              </h3>
              <p className="text-body-md text-on-surface-variant">
                Approved milestones unlock their portion of funds. Failed
                milestones return funds to backers.
              </p>
            </div>
          </div>

          <div className="mt-10">
            <Link
              href="/how-it-works"
              className="text-primary text-label-md hover:underline"
            >
              Learn more about the mechanics →
            </Link>
          </div>
        </Container>
      </section>

      {/* Section 3: Featured live projects */}
      <section className="bg-background py-16">
        <Container>
          <h2 className="text-headline-lg text-on-surface">Live projects</h2>
          <p className="text-body-md text-on-surface-variant mt-2">
            These projects are actively raising right now.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            {/* Card 1 */}
            <Card>
              <div className="mb-3">
                <Badge status="active">Live</Badge>
              </div>
              <h3 className="text-headline-md text-on-surface">
                Open Source USDT Analytics Dashboard
              </h3>
              <p className="text-label-sm text-on-surface-variant mt-1">
                Data Commons DAO
              </p>
              <p className="text-label-sm text-on-surface mt-4">
                Target: $24,000
              </p>
              <div className="mt-3">
                <Progress value={67} />
                <p className="text-label-sm text-on-surface-variant mt-2">
                  67% funded · 890 backers
                </p>
              </div>
            </Card>

            {/* Card 2 */}
            <Card>
              <div className="mb-3">
                <Badge status="active">Live</Badge>
              </div>
              <h3 className="text-headline-md text-on-surface">
                Decentralized Weather Station Network
              </h3>
              <p className="text-label-sm text-on-surface-variant mt-1">
                ClimateDAO
              </p>
              <p className="text-label-sm text-on-surface mt-4">
                Target: $8,500
              </p>
              <div className="mt-3">
                <Progress value={23} />
                <p className="text-label-sm text-on-surface-variant mt-2">
                  23% funded · 312 backers
                </p>
              </div>
            </Card>

            {/* Card 3 */}
            <Card>
              <div className="mb-3">
                <Badge status="active">Live</Badge>
              </div>
              <h3 className="text-headline-md text-on-surface">
                On-chain Grant Management Protocol
              </h3>
              <p className="text-label-sm text-on-surface-variant mt-1">
                Public Goods Foundation
              </p>
              <p className="text-label-sm text-on-surface mt-4">
                Target: $60,000
              </p>
              <div className="mt-3">
                <Progress value={91} />
                <p className="text-label-sm text-on-surface-variant mt-2">
                  91% funded · 2,103 backers
                </p>
              </div>
            </Card>
          </div>

          <div className="mt-10">
            <Button variant="outline" asChild>
              <Link href="/projects">View all projects</Link>
            </Button>
          </div>
        </Container>
      </section>

      {/* Section 4: CTA strip */}
      <section className="bg-primary py-16">
        <Container className="text-center">
          <h2 className="text-headline-lg text-on-primary">
            Back something real.
          </h2>
          <p className="text-body-lg text-on-primary/80 mt-4">
            Every contribution is protected by a smart contract. Every
            milestone is verified by the backers who funded it.
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
