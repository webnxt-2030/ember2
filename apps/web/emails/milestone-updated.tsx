import { Button, Heading, Hr, Link, Text } from '@react-email/components'
import React from 'react'
import { EmailLayout } from './_layout'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ember.app'

export interface MilestoneUpdatedProps {
  name: string
  projectName: string
  milestoneTitle: string
  projectUrl: string
}

export const subject = (props: MilestoneUpdatedProps) =>
  `Milestone update: ${props.milestoneTitle}`

export default function MilestoneUpdated({
  name: _name,
  projectName,
  milestoneTitle,
  projectUrl,
}: MilestoneUpdatedProps): React.ReactElement {
  return (
    <EmailLayout preview={`${projectName} updated a milestone you backed.`}>
      <Heading style={{ fontSize: 24, fontWeight: 700, color: '#1c1b1a', margin: '0 0 16px 0', letterSpacing: '-0.01em' }}>
        Milestone updated: {milestoneTitle}
      </Heading>
      <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 24px 0' }}>
        The Org Owner of {projectName} updated details for a milestone you've backed.
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
        View milestone
      </Button>
      <Hr style={{ margin: '32px 0 16px 0', borderColor: '#e8e3e1' }} />
      <Text style={{ fontSize: 11, color: '#4f4543', textAlign: 'center' as const, margin: 0 }}>
        <Link href={`${APP_URL}/dashboard/settings?unsubscribe=true`} style={{ color: '#4f4543' }}>
          Unsubscribe
        </Link>
        {' from non-essential emails.'}
      </Text>
    </EmailLayout>
  )
}
