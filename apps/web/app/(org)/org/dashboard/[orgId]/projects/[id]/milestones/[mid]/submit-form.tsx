'use client'

import { useState } from 'react'
import { formatContractError } from '@ember/shared'
import { useStellarWallet } from '@/components/providers/stellar-provider'
import { simulateAndSubmit } from '@/lib/stellar/contract'
import { string, u32 } from '@/lib/stellar/scval'
import { getExplorerTxUrl } from '@/lib/stellar/config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface SubmitFormProps {
  projectId: string
  orgId: string
  milestoneIndex: number
  escrowContractId: string
}

type FlowState =
  | { type: 'idle' }
  | { type: 'submitting' }
  | { type: 'pending' }
  | { type: 'success'; hash: string }

interface SubmitApiResponse {
  escrowContractId: string
  milestoneIndex: number
  updateUri: string
  networkPassphrase: string
}

export function SubmitForm({
  projectId,
  milestoneIndex,
  escrowContractId,
}: SubmitFormProps) {
  const { wallet } = useStellarWallet()
  const [updateNote, setUpdateNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [flow, setFlow] = useState<FlowState>({ type: 'idle' })
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
      setFlow({ type: 'pending' })

      if (!wallet) {
        setError('Wallet not connected')
        setFlow({ type: 'idle' })
        return
      }

      const { txHash } = await simulateAndSubmit(
        wallet,
        escrowContractId,
        'submit_milestone',
        [u32(milestoneIndex), string(data.updateUri)],
      )
      setFlow({ type: 'success', hash: txHash })
    } catch (err) {
      setError(formatContractError(err as Error) ?? 'Network error. Please try again.')
      setFlow({ type: 'idle' })
    }
  }

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
              <p className="text-label-sm text-on-surface-variant mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">info</span>
                Your milestone will appear for voting once the indexer confirms the on-chain event.
              </p>
            </div>
            <a
              href={getExplorerTxUrl(flow.hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-label-md"
            >
              View on Stellar Explorer
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

            {flow.type === 'idle' || flow.type === 'submitting' ? (
              <Button
                onClick={() => void handlePrepare()}
                disabled={flow.type === 'submitting'}
              >
                {flow.type === 'submitting'
                  ? 'Preparing...'
                  : 'Submit on-chain'}
              </Button>
            ) : (
              <>
                <p className="text-label-sm text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  Submitting requires wallet confirmation and ledger inclusion on Stellar. The milestone status will update once the indexer syncs.
                </p>
                <Button disabled>Confirm in wallet...</Button>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
