import { Button, Heading, Hr, Link, Text } from '@react-email/components'
import React from 'react'
import { EmailLayout } from './_layout'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ember.app'

export interface ContributionReceivedProps {
  name: string
  projectName: string
  amount: string
  txHash: string
  nftTokenId: string
}

export const subject = (props: ContributionReceivedProps) =>
  `Your contribution to ${props.projectName} is confirmed.`

function truncateTxHash(hash: string): string {
  if (hash.length <= 12) return hash
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}

export default function ContributionReceived({
  name: _name,
  projectName,
  amount,
  txHash,
  nftTokenId,
}: ContributionReceivedProps): React.ReactElement {
  return (
    <EmailLayout preview={`${amount} backed. NFT #${nftTokenId} minted.`}>
      <Heading style={{ fontSize: 24, fontWeight: 700, color: '#1c1b1a', margin: '0 0 16px 0', letterSpacing: '-0.01em' }}>
        {amount} contributed to {projectName}.
      </Heading>
      <Text style={{ fontSize: 15, color: '#4f4543', lineHeight: '1.6', margin: '0 0 16px 0' }}>
        Your contribution is confirmed on Morph L2. Your position NFT (#{nftTokenId}) has been minted.
      </Text>
      <Text style={{ fontSize: 13, color: '#4f4543', fontFamily: 'JetBrains Mono, monospace', margin: '0 0 24px 0' }}>
        Tx: {truncateTxHash(txHash)}
      </Text>
      <Button
        href={`${APP_URL}/dashboard/contributions`}
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
        View your contribution
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
