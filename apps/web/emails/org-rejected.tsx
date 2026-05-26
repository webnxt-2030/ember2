import { Heading, Text } from '@react-email/components'
import React from 'react'
import { EmailLayout } from './_layout'

export interface OrgRejectedProps {
  orgName: string
  reason?: string
}

export const subject = (props: OrgRejectedProps) =>
  `${props.orgName} was not verified.`

export default function OrgRejected({ orgName, reason }: OrgRejectedProps): React.ReactElement {
  return (
    <EmailLayout preview="Your organization verification was unsuccessful.">
      <Heading style={{ fontSize: 24, fontWeight: 700, color: '#1c1b1a', margin: '0 0 16px 0', letterSpacing: '-0.01em' }}>
        {orgName} was not verified.
      </Heading>
      <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 16px 0' }}>
        Your organization verification was unsuccessful.
      </Text>
      {reason != null && reason !== '' && (
        <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 16px 0' }}>
          Reason: {reason}
        </Text>
      )}
      <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: 0 }}>
        If you believe this is an error, reply to this email.
      </Text>
    </EmailLayout>
  )
}
