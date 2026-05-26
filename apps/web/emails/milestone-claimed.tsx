import { Button, Heading, Text } from '@react-email/components'
import React from 'react'
import { EmailLayout } from './_layout'

export interface MilestoneClaimedProps {
  name: string
  projectName: string
  milestoneTitle: string
  amount: string
  projectUrl: string
}

export const subject = (props: MilestoneClaimedProps) =>
  `Milestone claimed: ${props.milestoneTitle}`

export default function MilestoneClaimed({
  name: _name,
  projectName,
  milestoneTitle,
  amount,
  projectUrl,
}: MilestoneClaimedProps): React.ReactElement {
  return (
    <EmailLayout preview={`${amount} released for ${projectName} — ${milestoneTitle} complete.`}>
      <Heading style={{ fontSize: 24, fontWeight: 700, color: '#1c1b1a', margin: '0 0 16px 0', letterSpacing: '-0.01em' }}>
        Milestone claimed: {milestoneTitle}
      </Heading>
      <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 24px 0' }}>
        The Org Owner of {projectName} has claimed {amount} for '{milestoneTitle}'.
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
