'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

interface MilestoneForm {
  title: string
  description: string
  deliverableDate: string
}

interface EditProjectFormProps {
  orgId: string
  projectId: string
  initialTitle: string
  initialSlug: string
  initialSummary: string
  initialDescription: string | null
  initialPictures: string[]
  initialSocialLinks: Record<string, string>
  initialBackingLinks: string[]
  initialTargetAmount: string
  initialFundingDeadline: string
  initialVotingPeriodDays: number
  initialMilestones: MilestoneForm[]
}

export function EditProjectForm({
  orgId,
  projectId,
  initialTitle,
  initialSlug,
  initialSummary,
  initialDescription,
  initialPictures,
  initialSocialLinks,
  initialBackingLinks,
  initialTargetAmount,
  initialFundingDeadline,
  initialVotingPeriodDays,
  initialMilestones,
}: EditProjectFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [slug, setSlug] = useState(initialSlug)
  const [summary, setSummary] = useState(initialSummary)
  const [description, setDescription] = useState(initialDescription ?? '')
  const [pictures, setPictures] = useState<string[]>(
    Array.from({ length: 10 }, (_, i) => initialPictures[i] ?? ''),
  )
  const [twitter, setTwitter] = useState(initialSocialLinks.twitter ?? '')
  const [github, setGithub] = useState(initialSocialLinks.github ?? '')
  const [website, setWebsite] = useState(initialSocialLinks.website ?? '')
  const [backingLinks, setBackingLinks] = useState<string[]>(
    Array.from({ length: 5 }, (_, i) => initialBackingLinks[i] ?? ''),
  )
  const [targetAmount, setTargetAmount] = useState(initialTargetAmount)
  const [fundingDeadline, setFundingDeadline] = useState(initialFundingDeadline)
  const [votingPeriodDays, setVotingPeriodDays] = useState(initialVotingPeriodDays)
  const [milestones, setMilestones] = useState<MilestoneForm[]>(initialMilestones)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function updateMilestone<K extends keyof MilestoneForm>(i: number, field: K, val: MilestoneForm[K]) {
    const ms = [...milestones]
    ms[i] = { ...ms[i], [field]: val } as MilestoneForm
    setMilestones(ms)
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          title,
          summary,
          description: description || undefined,
          pictures: pictures.filter(Boolean),
          socialLinks: {
            twitter: twitter || undefined,
            github: github || undefined,
            website: website || undefined,
          },
          backingLinks: backingLinks.filter(Boolean),
          targetAmount,
          fundingDeadline: fundingDeadline || undefined,
          votingPeriodDays,
          milestones: milestones.map((m) => ({
            title: m.title,
            description: m.description,
            ...(m.deliverableDate ? { deliverableDate: m.deliverableDate } : {}),
          })),
        }),
      })
      const data = (await res.json()) as { detail?: string; title?: string }
      if (!res.ok) {
        setError(data.detail ?? data.title ?? 'Failed to update project')
        return
      }
      router.push(`/org/dashboard/${orgId}/projects/${projectId}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-8">
      {error && <p className="text-label-sm text-error">{error}</p>}

      <Card>
        <CardContent className="pt-6 space-y-6">
          <h2 className="text-headline-md text-on-surface">Metadata</h2>
          <Input label="Project title" value={title} onChange={(e) => { setTitle(e.target.value); }} required />
          <Input label="URL slug" value={slug} onChange={(e) => { setSlug(e.target.value); }} required />
          <Input label="Summary" value={summary} onChange={(e) => { setSummary(e.target.value); }} required />
          <div>
            <label className="block text-label-md text-on-surface mb-2">Description (Markdown)</label>
            <textarea
              value={description}
              onChange={(e) => { setDescription(e.target.value); }}
              rows={8}
              className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-y"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <h2 className="text-headline-md text-on-surface">Pictures &amp; Links</h2>
          {pictures.map((pic, i) => (
            <Input
              key={i}
              label={`Picture ${String(i + 1)} URL`}
              value={pic}
              onChange={(e) => {
                const p = [...pictures]
                p[i] = e.target.value
                setPictures(p)
              }}
              type="url"
            />
          ))}
          <Input label="Twitter URL" value={twitter} onChange={(e) => { setTwitter(e.target.value); }} type="url" />
          <Input label="GitHub URL" value={github} onChange={(e) => { setGithub(e.target.value); }} type="url" />
          <Input label="Website URL" value={website} onChange={(e) => { setWebsite(e.target.value); }} type="url" />
          {backingLinks.map((link, i) => (
            <Input
              key={i}
              label={`Backing link ${String(i + 1)}`}
              value={link}
              onChange={(e) => {
                const b = [...backingLinks]
                b[i] = e.target.value
                setBackingLinks(b)
              }}
              type="url"
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <h2 className="text-headline-md text-on-surface">Target &amp; Timeline</h2>
          <Input
            label="Target amount (USDT)"
            value={targetAmount}
            onChange={(e) => { setTargetAmount(e.target.value); }}
            required
          />
          <Input
            label="Funding deadline"
            value={fundingDeadline}
            onChange={(e) => { setFundingDeadline(e.target.value); }}
            type="datetime-local"
          />
          <div>
            <label className="block text-label-md text-on-surface mb-2">
              Voting period (minutes): {votingPeriodDays}
            </label>
            <input
              type="number"
              min={1}
              max={43200}
              step={1}
              value={votingPeriodDays}
              onChange={(e) => { setVotingPeriodDays(Number(e.target.value)); }}
              className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-between text-label-sm text-on-surface-variant mt-1">
              <span>1 min</span>
              <span>30 days (43200 min)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <h2 className="text-headline-md text-on-surface">Milestones</h2>
          <div className="space-y-6">
            {milestones.map((m, i) => (
              <div key={i} className="border border-outline-variant rounded-xl p-4 space-y-4">
                <h3 className="text-label-md text-on-surface font-semibold">Milestone {i + 1}</h3>
                <Input
                  label="Title"
                  value={m.title}
                  onChange={(e) => { updateMilestone(i, 'title', e.target.value); }}
                  required
                />
                <div>
                  <label className="block text-label-md text-on-surface mb-2">Description</label>
                  <textarea
                    value={m.description}
                    onChange={(e) => { updateMilestone(i, 'description', e.target.value); }}
                    rows={3}
                    className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-y"
                  />
                </div>
                <Input
                  label="Deliverable date"
                  value={m.deliverableDate}
                  onChange={(e) => { updateMilestone(i, 'deliverableDate', e.target.value); }}
                  type="date"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => { router.push(`/org/dashboard/${orgId}/projects/${projectId}`); }}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
