import { Button, Heading, Text } from '@react-email/components'
import React from 'react'
import { EmailLayout } from './_layout'

export interface MilestoneVoteComingSoonProps {
  name: string
  projectName: string
  milestoneTitle: string
  deliverableDate: string
  projectUrl: string
}

export const subject = (props: MilestoneVoteComingSoonProps) =>
  `Milestone due soon: ${props.milestoneTitle}`

export default function MilestoneVoteComingSoon({
  name: _name,
  projectName,
  milestoneTitle,
  deliverableDate,
  projectUrl,
}: MilestoneVoteComingSoonProps): React.ReactElement {
  return (
    <EmailLayout preview={`${projectName} — milestone due ${deliverableDate}.`}>
      <Heading style={{ fontSize: 24, fontWeight: 700, color: '#1c1b1a', margin: '0 0 16px 0', letterSpacing: '-0.01em' }}>
        Vote opening soon: {milestoneTitle}
      </Heading>
      <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 16px 0' }}>
        {projectName} expects to submit Milestone '{milestoneTitle}' for a vote. The deliverable date is {deliverableDate}.
      </Text>
      <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 24px 0' }}>
        You'll receive a separate email when voting opens.
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
        View project
      </Button>
    </EmailLayout>
  )
}
