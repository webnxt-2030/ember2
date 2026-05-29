import { Button, Heading, Text } from '@react-email/components'
import React from 'react'
import { EmailLayout } from './_layout'

export interface AdminInvitationProps {
  email: string
  orgName: string
  invitedBy: string
  inviteUrl: string
}

export const subject = (props: AdminInvitationProps) =>
  `You've been added as an owner of ${props.orgName} on Ember.`

export default function AdminInvitation({
  email,
  orgName,
  invitedBy,
  inviteUrl,
}: AdminInvitationProps): React.ReactElement {
  return (
    <EmailLayout preview={`${invitedBy} added you as an org owner.`}>
      <Heading style={{ fontSize: 24, fontWeight: 700, color: '#1c1b1a', margin: '0 0 16px 0', letterSpacing: '-0.01em' }}>
        You've been added to {orgName}.
      </Heading>
      <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 16px 0' }}>
        {invitedBy} has added you as an owner of {orgName} on Ember.
      </Text>
      <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 24px 0' }}>
        If you don't have an Ember account, sign up with your email address ({email}).
      </Text>
      <Button
        href={inviteUrl}
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
        Accept invitation
      </Button>
    </EmailLayout>
  )
}
