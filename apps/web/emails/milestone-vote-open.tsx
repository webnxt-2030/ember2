import { Button, Heading, Text } from '@react-email/components'
import React from 'react'
import { EmailLayout } from './_layout'

export interface MilestoneVoteOpenProps {
  name: string
  projectName: string
  milestoneTitle: string
  voteEndAt: string
  projectUrl: string
}

export const subject = (props: MilestoneVoteOpenProps) =>
  `Vote now: ${props.milestoneTitle}`

export default function MilestoneVoteOpen({
  name: _name,
  projectName,
  milestoneTitle,
  voteEndAt,
  projectUrl,
}: MilestoneVoteOpenProps): React.ReactElement {
  return (
    <EmailLayout preview={`${projectName} — voting closes ${voteEndAt}.`}>
      <Heading style={{ fontSize: 24, fontWeight: 700, color: '#1c1b1a', margin: '0 0 16px 0', letterSpacing: '-0.01em' }}>
        Vote open: {milestoneTitle}
      </Heading>
      <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 16px 0' }}>
        {projectName} has submitted '{milestoneTitle}' for backer vote. Voting closes {voteEndAt}.
      </Text>
      <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 24px 0' }}>
        Your vote is weighted by your contribution amount.
      </Text>
      <Button
        href={projectUrl}
        style={{
          backgroundColor: '#b72301',
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 600,
          padding: '12px 24px',
          borderRadius: 6,
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        Cast your vote
      </Button>
    </EmailLayout>
  )
}
