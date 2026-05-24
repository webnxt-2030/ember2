import { Button, Heading, Text } from '@react-email/components'
import React from 'react'
import { EmailLayout } from './_layout'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ember.app'

export interface WelcomeProps {
  name: string
}

export const subject = 'Welcome to Ember.'

export default function Welcome({ name }: WelcomeProps): React.ReactElement {
  return (
    <EmailLayout preview="You're in. Start backing projects.">
      <Heading style={{ fontSize: 24, fontWeight: 700, color: '#1c1b1a', margin: '0 0 16px 0', letterSpacing: '-0.01em' }}>
        Welcome, {name}.
      </Heading>
      <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 24px 0' }}>
        You can now back projects on Ember — milestone-based crowdfunding on Morph L2. Funds release only when milestones are verified on-chain.
      </Text>
      <Button
        href={`${APP_URL}/projects`}
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
        Browse Projects
      </Button>
    </EmailLayout>
  )
}
