import { Button, Heading, Text } from '@react-email/components'
import React from 'react'
import { EmailLayout } from './_layout'

export interface OrgVerifiedProps {
  orgName: string
  orgUrl: string
}

export const subject = (props: OrgVerifiedProps) =>
  `${props.orgName} is now verified on Ember.`

export default function OrgVerified({ orgName, orgUrl }: OrgVerifiedProps): React.ReactElement {
  return (
    <EmailLayout preview="Your organization is verified. You can now publish projects.">
      <Heading style={{ fontSize: 24, fontWeight: 700, color: '#1c1b1a', margin: '0 0 16px 0', letterSpacing: '-0.01em' }}>
        {orgName} is verified.
      </Heading>
      <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 24px 0' }}>
        Your organization has been reviewed and verified by the Ember admin team. You can now create and publish projects.
      </Text>
      <Button
        href={orgUrl}
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
        Go to your org dashboard
      </Button>
    </EmailLayout>
  )
}
