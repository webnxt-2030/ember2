'use client'

import { useState, useEffect } from 'react'
import { formatContractError } from '@ember/shared'
import { useStellarWallet } from '@/components/providers/stellar-provider'
import { simulateAndSubmit } from '@/lib/stellar/contract'
import { address, string, u32, vec } from '@/lib/stellar/scval'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PublishButtonProps {
  projectId: string
  orgId: string
}

type FlowState =
  | { type: 'idle' }
  | { type: 'preparing' }
  | { type: 'pending' }
  | { type: 'finalizing' }
  | { type: 'success' }

interface PublishApiResponse {
  factoryContractId: string
  organization: string
  milestoneBps: number[]
  votingPeriodSeconds: number
  projectURI: string
  networkPassphrase: string
}

export function PublishButton({ projectId }: PublishButtonProps) {
  const { wallet, isConnected, connect } = useStellarWallet()
  const [error, setError] = useState<string | null>(null)
  const [flow, setFlow] = useState<FlowState>({ type: 'idle' })
  const [txHash, setTxHash] = useState<string | null>(null)

  // Triggered once the on-chain tx is submitted
  useEffect(() => {
    if (flow.type === 'finalizing' && txHash) {
      fetch(`/api/projects/${projectId}/publish/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash }),
      }).catch(() => {
        // Background confirmation failed; indexer will eventually reconcile
      })
    }
  }, [flow.type, txHash, projectId])

  // Poll project status until it flips to LIVE, then reload
  useEffect(() => {
    if (flow.type !== 'finalizing') return

    const poll = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/status`)
        if (!res.ok) return
        const data = (await res.json()) as { status?: string }
        if (data.status === 'LIVE') {
          window.location.reload()
        }
      } catch {
        // Ignore polling errors; next tick will retry
      }
    }

    void poll()
    const interval = setInterval(() => {
      void poll()
    }, 2000)
    return () => {
      clearInterval(interval)
    }
  }, [flow.type, projectId])

  async function handlePrepare() {
    setError(null)
    if (!isConnected) {
      await connect()
      return
    }
    if (!wallet) {
      setError('Wallet not connected')
      return
    }

    setFlow({ type: 'preparing' })
    try {
      const res = await fetch(`/api/projects/${projectId}/publish`, {
        method: 'POST',
      })
      const data = (await res.json()) as PublishApiResponse
      if (!res.ok) {
        const errData = data as unknown as { detail?: string; title?: string }
        setError(errData.detail ?? errData.title ?? 'Failed to prepare publish')
        setFlow({ type: 'idle' })
        return
      }

      setFlow({ type: 'pending' })
      const { txHash: hash } = await simulateAndSubmit(
        wallet,
        data.factoryContractId,
        'create_project',
        [
          address(data.organization),
          vec(data.milestoneBps.map((bps) => u32(bps))),
          u32(data.votingPeriodSeconds),
          string(data.projectURI),
        ],
      )
      setTxHash(hash)
      setFlow({ type: 'finalizing' })
    } catch (err) {
      setError(formatContractError(err as Error) ?? 'Network error. Please try again.')
      setFlow({ type: 'idle' })
    }
  }

  if (flow.type === 'success') {
    return (
      <Card className="w-full max-w-xl">
        <CardContent className="pt-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h3 className="text-headline-sm text-on-surface">Project Published</h3>
          <p className="text-body-md text-on-surface-variant mt-1">
            Your project is now live and open for contributions.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (flow.type === 'finalizing' || flow.type === 'pending') {
    return (
      <Card className="w-full max-w-xl">
        <CardContent className="pt-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg
              className="animate-spin text-primary"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
          <h3 className="text-headline-sm text-on-surface">
            {flow.type === 'pending' ? 'Confirm in wallet...' : 'Finalizing publish'}
          </h3>
          <p className="text-body-md text-on-surface-variant mt-1">
            {flow.type === 'pending'
              ? 'Please approve the transaction in your wallet.'
              : 'Transaction submitted. Waiting for on-chain data to sync...'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Publish project</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-body-md text-on-surface-variant">
          Publishing deploys the project escrow and NFT contracts on-chain. This action cannot be undone.
        </p>

        {error && <p className="text-label-sm text-error">{error}</p>}

        <Button
          onClick={() => void handlePrepare()}
          disabled={flow.type === 'preparing'}
        >
          {flow.type === 'preparing' ? 'Preparing...' : 'Publish on-chain'}
        </Button>
      </CardContent>
    </Card>
  )
}
