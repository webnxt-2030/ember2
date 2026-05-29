'use client'

import { useState, useEffect } from 'react'
import {
  useConnection,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { formatContractError } from '@ember/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PublishButtonProps {
  projectId: string
  orgId: string
}

type FlowState =
  | { type: 'idle' }
  | { type: 'preparing' }
  | { type: 'ready'; to: `0x${string}`; calldata: `0x${string}`; chainId: number }
  | { type: 'finalizing' }
  | { type: 'success' }

interface PublishApiResponse {
  to: `0x${string}`
  calldata: `0x${string}`
  projectURI: string
  chainId: number
}

export function PublishButton({ projectId }: PublishButtonProps) {
  const { isConnected } = useConnection()
  const { open } = useAppKit()
  const [error, setError] = useState<string | null>(null)
  const [flow, setFlow] = useState<FlowState>({ type: 'idle' })

  const {
    mutate,
    isPending: isSendPending,
    error: sendError,
    data: hash,
  } = useSendTransaction()

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash })

  // Triggered once the on-chain tx is mined (1 confirmation)
  useEffect(() => {
    if (isConfirmed && hash && flow.type !== 'finalizing' && flow.type !== 'success') {
      setFlow({ type: 'finalizing' })

      // Fire confirmation in the background so ActivityLog is still recorded
      fetch(`/api/projects/${projectId}/publish/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: hash }),
      }).catch(() => {
        // Background confirmation failed; indexer will eventually reconcile
      })
    }
  }, [isConfirmed, hash, flow.type, projectId])

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
      setFlow({
        type: 'ready',
        to: data.to,
        calldata: data.calldata,
        chainId: data.chainId,
      })
    } catch {
      setError('Network error. Please try again.')
      setFlow({ type: 'idle' })
    }
  }

  function handlePublish() {
    if (flow.type !== 'ready') return
    if (!isConnected) {
      void open()
      return
    }
    mutate({
      to: flow.to,
      data: flow.calldata,
    })
  }

  const formatError = formatContractError

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

  if (flow.type === 'finalizing') {
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
          <h3 className="text-headline-sm text-on-surface">Finalizing publish</h3>
          <p className="text-body-md text-on-surface-variant mt-1">
            Transaction confirmed. Waiting for on-chain data to sync...
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
        {formatError(sendError) && (
          <p className="text-label-sm text-error">
            {formatError(sendError)}
          </p>
        )}

        {flow.type === 'idle' || flow.type === 'preparing' ? (
          <Button
            onClick={() => void handlePrepare()}
            disabled={flow.type === 'preparing'}
          >
            {flow.type === 'preparing' ? 'Preparing...' : 'Prepare publish'}
          </Button>
        ) : (
          <>
            <p className="text-label-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              Publishing requires wallet confirmation and block mining on Morph L2. The project will go live once the transaction is indexed.
            </p>
            <Button
              onClick={handlePublish}
              disabled={isSendPending || isConfirming}
            >
              {isSendPending
                ? 'Confirm in wallet...'
                : isConfirming
                  ? 'Confirming on-chain...'
                  : 'Publish on-chain'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
