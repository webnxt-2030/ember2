import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import React from "react";
import { render } from "@react-email/render";
import * as emails from "@/emails/index";

type TemplateName =
  | "WELCOME"
  | "CONTRIBUTION_RECEIVED"
  | "MILESTONE_UPDATED"
  | "MILESTONE_VOTE_OPEN"
  | "MILESTONE_VOTE_OUTCOME"
  | "MILESTONE_CLAIMED"
  | "ORG_VERIFIED"
  | "ORG_REJECTED"
  | "ADMIN_INVITATION";

const TEMPLATES: Partial<Record<TemplateName, {
  Subject: (p: unknown) => string;
  Component: React.ComponentType<unknown>;
}>> = {
  WELCOME: { Subject: (p) => emails.welcomeSubject(p as emails.WelcomeProps), Component: emails.Welcome as React.ComponentType<unknown> },
  CONTRIBUTION_RECEIVED: { Subject: (p) => emails.contributionReceivedSubject(p as emails.ContributionReceivedProps), Component: emails.ContributionReceived as React.ComponentType<unknown> },
  MILESTONE_UPDATED: { Subject: (p) => emails.milestoneUpdatedSubject(p as emails.MilestoneUpdatedProps), Component: emails.MilestoneUpdated as React.ComponentType<unknown> },
  MILESTONE_VOTE_OPEN: { Subject: (p) => emails.milestoneVoteOpenSubject(p as emails.MilestoneVoteOpenProps), Component: emails.MilestoneVoteOpen as React.ComponentType<unknown> },
  MILESTONE_VOTE_OUTCOME: { Subject: (p) => emails.milestoneVoteOutcomeSubject(p as emails.MilestoneVoteOutcomeProps), Component: emails.MilestoneVoteOutcome as React.ComponentType<unknown> },
  MILESTONE_CLAIMED: { Subject: (p) => emails.milestoneClaimedSubject(p as emails.MilestoneClaimedProps), Component: emails.MilestoneClaimed as React.ComponentType<unknown> },
  ORG_VERIFIED: { Subject: (p) => emails.orgVerifiedSubject(p as emails.OrgVerifiedProps), Component: emails.OrgVerified as React.ComponentType<unknown> },
  ORG_REJECTED: { Subject: (p) => emails.orgRejectedSubject(p as emails.OrgRejectedProps), Component: emails.OrgRejected as React.ComponentType<unknown> },
  ADMIN_INVITATION: { Subject: (p) => emails.adminInvitationSubject(p as emails.AdminInvitationProps), Component: emails.AdminInvitation as React.ComponentType<unknown> },
};

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-indexer-api-key");
  if (apiKey !== process.env.INDEXER_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as { template: string; payload: Record<string, unknown> };
  const { template, payload } = body;

  const entry = TEMPLATES[template as TemplateName];
  if (!entry) {
    return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 });
  }

  const subject = entry.Subject(payload);
  const html = render(React.createElement(entry.Component, payload), { pretty: true });

  return NextResponse.json({ html, subject });
}