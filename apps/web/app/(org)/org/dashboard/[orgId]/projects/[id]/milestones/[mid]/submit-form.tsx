'use client'

import { useState, useEffect } from 'react'
import {
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { ProjectEscrowAbi, formatContractError } from '@ember/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SubmitFormProps {
  projectId: string
  orgId: string
  milestoneIndex: number
  escrowAddress: `0x${string}`
}

type FlowState =
  | { type: 'idle' }
  | { type: 'submitting' }
  | { type: 'ready' }
  | { type: 'success'; hash: `0x${string}` }

interface SubmitApiResponse {
  to: string
  calldata: `0x${string}`
  milestoneIndex: number
  updateUri: string
  chainId: number
}

export function SubmitForm({
  projectId,
  milestoneIndex,
  escrowAddress,
}: SubmitFormProps) {
  const [updateNote, setUpdateNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [flow, setFlow] = useState<FlowState>({ type: 'idle' })
  const [updateUri, setUpdateUri] = useState<string>('')

  const { data: sim, error: simError } = useSimulateContract({
    abi: ProjectEscrowAbi,
    address: escrowAddress,
    functionName: 'submitMilestone',
    args: [BigInt(milestoneIndex), updateUri || ''],
    query: {
      enabled: flow.type === 'ready' && !!updateUri,
    },
  })

  const {
    mutate,
    isPending: isWritePending,
    error: writeError,
    data: hash,
  } = useWriteContract()

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (isConfirmed && hash && flow.type !== 'success') {
      setFlow({ type: 'success', hash })
    }
  }, [isConfirmed, hash, flow.type])

  async function handlePrepare() {
    setError(null)
    if (!updateNote.trim()) {
      setError('Please enter an update note.')
      return
    }

    setFlow({ type: 'submitting' })
    try {
      const res = await fetch(
        `/api/projects/${projectId}/milestones/${String(milestoneIndex)}/submit`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updateNote }),
        },
      )
      const data = (await res.json()) as SubmitApiResponse
      if (!res.ok) {
        setError(
          (data as unknown as { detail?: string; title?: string }).detail ??
            (data as unknown as { detail?: string; title?: string }).title ??
            'Failed to prepare submission',
        )
        setFlow({ type: 'idle' })
        return
      }
      setUpdateUri(data.updateUri)
      setFlow({ type: 'ready' })
    } catch {
      setError('Network error. Please try again.')
      setFlow({ type: 'idle' })
    }
  }

  function handleSubmit() {
    if (!sim?.request) return
    mutate(sim.request)
  }

  const formatError = formatContractError

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Submit for vote</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {flow.type === 'success' ? (
          <div className="flex flex-col gap-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
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
            <div>
              <h3 className="text-headline-sm text-on-surface">
                Milestone Submitted
              </h3>
              <p className="text-body-md text-on-surface-variant mt-1">
                Your milestone has been submitted for voting.
              </p>
            </div>
            <a
              href={`${process.env.NEXT_PUBLIC_MORPH_EXPLORER_URL ?? ''}/tx/${flow.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-label-md"
            >
              View on Morph Explorer
            </a>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-label-md text-on-surface mb-2">
                Update note (Markdown)
              </label>
              <textarea
                value={updateNote}
                onChange={(e) => {
                  setUpdateNote(e.target.value)
                }}
                rows={8}
                className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-y"
                placeholder="Describe what was accomplished in this milestone. Markdown supported."
                disabled={flow.type !== 'idle'}
              />
            </div>

            {error && <p className="text-label-sm text-error">{error}</p>}
            {formatError(simError ?? writeError) && (
              <p className="text-label-sm text-error">
                {formatError(simError ?? writeError)}
              </p>
            )}

            {flow.type === 'idle' || flow.type === 'submitting' ? (
              <Button
                onClick={() => void handlePrepare()}
                disabled={flow.type === 'submitting'}
              >
                {flow.type === 'submitting'
                  ? 'Preparing...'
                  : 'Prepare submission'}
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!sim?.request || isWritePending || isConfirming}
              >
                {isWritePending
                  ? 'Confirm in wallet...'
                  : isConfirming
                    ? 'Confirming...'
                    : 'Submit on-chain'}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
