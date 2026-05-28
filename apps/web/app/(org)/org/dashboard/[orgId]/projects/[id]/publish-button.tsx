'use client'

import { useState, useEffect } from 'react'
import {
  useConnection,
  useSendTransaction,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
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
  | { type: 'confirming'; hash: `0x${string}` }
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
    sendTransaction,
    isPending: isSendPending,
    error: sendError,
    data: hash,
  } = useSendTransaction()

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (isConfirmed && hash && flow.type !== 'success') {
      setFlow({ type: 'confirming', hash })
      fetch(`/api/projects/${projectId}/publish/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: hash }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = (await res.json()) as { detail?: string; title?: string }
            throw new Error(data.detail ?? data.title ?? 'Confirmation failed')
          }
          setFlow({ type: 'success' })
          window.location.reload()
        })
        .catch((err: Error) => {
          setError(err.message)
          setFlow({ type: 'idle' })
        })
    }
  }, [isConfirmed, hash, flow.type, projectId])

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
    sendTransaction({
      to: flow.to,
      data: flow.calldata,
    })
  }

  const formatError = (err: Error | null | undefined): string | null => {
    if (!err) return null
    const msg = err.message
    if (msg.includes('User rejected') || msg.includes('rejected')) {
      return 'Transaction was rejected in your wallet'
    }
    return msg
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
        ) : flow.type === 'ready' ? (
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
        ) : (
          <Button disabled>Confirming...</Button>
        )}
      </CardContent>
    </Card>
  )
}
