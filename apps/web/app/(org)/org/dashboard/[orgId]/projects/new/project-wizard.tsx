'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { computeMilestoneBps } from '@ember/shared'
import { RewardCurve } from '@ember/shared'
import { cn } from '@/lib/cn'

type CurveType = 'LINEAR' | 'EXPONENTIAL' | 'BINARY' | 'CUSTOM'

function toCurveEnum(c: CurveType): RewardCurve {
  return RewardCurve[c]
}

interface MilestoneForm {
  title: string
  description: string
  deliverableDate: string
}

interface FormData {
  // Step 1
  title: string
  slug: string
  summary: string
  description: string
  // Step 2
  pictures: string[]
  socialLinks: { twitter: string; github: string; website: string }
  backingLinks: string[]
  // Step 3
  targetAmount: string
  fundingDeadline: string
  votingPeriodDays: number
  rewardCurveType: CurveType
  // Step 4
  milestoneCount: number
  milestoneBps: number[]
  milestones: MilestoneForm[]
}

const INITIAL_MILESTONE_COUNT = 3
const INITIAL_CURVE: CurveType = 'LINEAR'

function makeInitialMilestones(n: number): MilestoneForm[] {
  return Array.from({ length: n }, () => ({
    title: '',
    description: '',
    deliverableDate: '',
  }))
}

const CURVE_DESCRIPTIONS: Record<CurveType, string> = {
  LINEAR: 'Equal distribution',
  EXPONENTIAL: 'Later milestones heavier',
  BINARY: 'First milestone: 0 bps',
  CUSTOM: 'Custom (edit per milestone)',
}

const STEPS = ['Metadata', 'Pictures & Links', 'Target & Timeline', 'Milestones']

export function ProjectWizard({ orgId }: { orgId: string }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>({
    title: '',
    slug: '',
    summary: '',
    description: '',
    pictures: [],
    socialLinks: { twitter: '', github: '', website: '' },
    backingLinks: [],
    targetAmount: '',
    fundingDeadline: '',
    votingPeriodDays: 7,
    rewardCurveType: INITIAL_CURVE,
    milestoneCount: INITIAL_MILESTONE_COUNT,
    milestoneBps: computeMilestoneBps(
      toCurveEnum(INITIAL_CURVE),
      INITIAL_MILESTONE_COUNT,
    ),
    milestones: makeInitialMilestones(INITIAL_MILESTONE_COUNT),
  })

  function updateField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleTitleChange(v: string) {
    setForm((prev) => ({
      ...prev,
      title: v,
      slug: v
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    }))
  }

  function handleCurveChange(curve: CurveType, n: number = form.milestoneCount) {
    const bps = computeMilestoneBps(toCurveEnum(curve), n)
    setForm((prev) => ({ ...prev, rewardCurveType: curve, milestoneBps: bps }))
  }

  function handleMilestoneCountChange(n: number) {
    const clamped = Math.max(2, Math.min(20, n))
    const bps = computeMilestoneBps(toCurveEnum(form.rewardCurveType), clamped)
    const prevMs = form.milestones
    const newMs = Array.from(
      { length: clamped },
      (_, i) => prevMs[i] ?? { title: '', description: '', deliverableDate: '' },
    )
    setForm((prev) => ({
      ...prev,
      milestoneCount: clamped,
      milestoneBps: bps,
      milestones: newMs,
    }))
  }

  function handleBpsChange(i: number, val: string) {
    const n = parseInt(val, 10)
    if (isNaN(n) || n < 0) return
    const bps = [...form.milestoneBps]
    bps[i] = n
    updateField('milestoneBps', bps)
  }

  function handleMilestoneField(
    i: number,
    field: keyof MilestoneForm,
    val: string,
  ) {
    const ms = [...form.milestones]
    const existing: MilestoneForm = ms[i] ?? {
      title: '',
      description: '',
      deliverableDate: '',
    }
    ms[i] = { ...existing, [field]: val }
    updateField('milestones', ms)
  }

  const totalBps = form.milestoneBps.reduce((a, b) => a + b, 0)

  async function handleSubmit() {
    if (!form.title.trim() || !form.slug.trim() || !form.summary.trim() || !form.targetAmount.trim()) {
      setError('Please fill in all required fields: title, slug, summary, and target amount.')
      return
    }
    if (form.milestones.some(m => !m.title.trim())) {
      setError('All milestones must have a title.')
      return
    }
    if (totalBps !== 10000) {
      setError('Milestone basis points must sum to 10,000')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          slug: form.slug,
          title: form.title,
          summary: form.summary,
          description: form.description,
          pictures: form.pictures.filter(Boolean),
          socialLinks: {
            twitter: form.socialLinks.twitter || undefined,
            github: form.socialLinks.github || undefined,
            website: form.socialLinks.website || undefined,
          },
          backingLinks: form.backingLinks.filter(Boolean),
          targetAmount: form.targetAmount,
          fundingDeadline: form.fundingDeadline || undefined,
          votingPeriodDays: form.votingPeriodDays,
          rewardCurveType: form.rewardCurveType,
          milestoneBps: form.milestoneBps,
          milestones: form.milestones.map((m) => ({
            title: m.title,
            description: m.description,
            deliverableDate: m.deliverableDate || undefined,
          })),
        }),
      })
      const data = (await res.json()) as { detail?: string; title?: string }
      if (!res.ok) {
        setError(data.detail ?? data.title ?? 'Failed to create project')
        return
      }
      router.push(`/org/dashboard/${orgId}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => { if (i < step) setStep(i); }}
            className={cn(
              'px-4 py-2 rounded-xl text-label-sm transition-colors',
              i === step
                ? 'bg-primary text-on-primary'
                : i < step
                  ? 'bg-primary-fixed text-on-primary-fixed-variant cursor-pointer'
                  : 'bg-surface-container text-on-surface-variant cursor-default',
            )}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {/* Step 0: Metadata */}
      {step === 0 && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <Input
              label="Project title"
              value={form.title}
              onChange={(e) => { handleTitleChange(e.target.value); }}
              required
            />
            <Input
              label="URL slug"
              value={form.slug}
              onChange={(e) => { updateField('slug', e.target.value); }}
              required
            />
            <Input
              label="Summary (1-2 sentences)"
              value={form.summary}
              onChange={(e) => { updateField('summary', e.target.value); }}
              required
            />
            <div>
              <label className="block text-label-md text-on-surface mb-2">
                Description (Markdown)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => { updateField('description', e.target.value); }}
                rows={8}
                className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-y"
                placeholder="Describe your project in detail. Markdown supported."
              />
            </div>
            <Button variant="primary" onClick={() => { setStep(1); }}>
              Next: Pictures &amp; Links
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Pictures & Links */}
      {step === 1 && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              <label className="block text-label-md text-on-surface">
                Picture URLs (up to 10)
              </label>
              {Array.from({length: 10}, (_, i) => i).map((i) => (
                <Input
                  key={i}
                  label={`Picture ${String(i + 1)} URL`}
                  value={form.pictures[i] ?? ''}
                  onChange={(e) => {
                    const pics = [...form.pictures]
                    pics[i] = e.target.value
                    updateField('pictures', pics)
                  }}
                  type="url"
                />
              ))}
            </div>
            <Input
              label="Twitter URL (optional)"
              value={form.socialLinks.twitter}
              onChange={(e) =>
                { updateField('socialLinks', {
                  ...form.socialLinks,
                  twitter: e.target.value,
                }); }
              }
              type="url"
            />
            <Input
              label="GitHub URL (optional)"
              value={form.socialLinks.github}
              onChange={(e) =>
                { updateField('socialLinks', {
                  ...form.socialLinks,
                  github: e.target.value,
                }); }
              }
              type="url"
            />
            <Input
              label="Website URL (optional)"
              value={form.socialLinks.website}
              onChange={(e) =>
                { updateField('socialLinks', {
                  ...form.socialLinks,
                  website: e.target.value,
                }); }
              }
              type="url"
            />
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => { setStep(0); }}>
                Back
              </Button>
              <Button variant="primary" onClick={() => { setStep(2); }}>
                Next: Target &amp; Timeline
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Target & Timeline */}
      {step === 2 && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <Input
              label="Target amount (USDT)"
              value={form.targetAmount}
              onChange={(e) => { updateField('targetAmount', e.target.value); }}
              placeholder="e.g. 50000"
              required
            />
            <Input
              label="Funding deadline (optional)"
              value={form.fundingDeadline}
              onChange={(e) => { updateField('fundingDeadline', e.target.value); }}
              type="datetime-local"
            />
            <div>
              <label className="block text-label-md text-on-surface mb-2">
                Voting period (days): {form.votingPeriodDays}
              </label>
              <input
                type="range"
                min={3}
                max={30}
                value={form.votingPeriodDays}
                onChange={(e) =>
                  { updateField('votingPeriodDays', Number(e.target.value)); }
                }
                className="w-full"
              />
              <div className="flex justify-between text-label-sm text-on-surface-variant mt-1">
                <span>3 days</span>
                <span>30 days</span>
              </div>
            </div>
            <div>
              <label className="block text-label-md text-on-surface mb-2">
                Reward curve
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['LINEAR', 'EXPONENTIAL', 'BINARY', 'CUSTOM'] as const).map(
                  (curve) => (
                    <button
                      key={curve}
                      type="button"
                      onClick={() => { handleCurveChange(curve); }}
                      className={cn(
                        'px-4 py-3 rounded-xl text-label-sm border transition-colors text-left',
                        form.rewardCurveType === curve
                          ? 'border-primary bg-primary-fixed text-on-primary-fixed-variant'
                          : 'border-outline text-on-surface hover:bg-surface-container-low',
                      )}
                    >
                      <div className="font-semibold">{curve}</div>
                      <div className="text-xs mt-1 text-on-surface-variant">
                        {CURVE_DESCRIPTIONS[curve]}
                      </div>
                    </button>
                  ),
                )}
              </div>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => { setStep(1); }}>
                Back
              </Button>
              <Button variant="primary" onClick={() => { setStep(3); }}>
                Next: Milestones
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Milestones */}
      {step === 3 && (
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-4">
              <Input
                label="Number of milestones (2-20)"
                value={String(form.milestoneCount)}
                onChange={(e) =>
                  { handleMilestoneCountChange(Number(e.target.value)); }
                }
                type="number"
              />
              <p
                className={cn(
                  'text-label-sm mt-6 whitespace-nowrap',
                  totalBps === 10000 ? 'text-tertiary' : 'text-error',
                )}
              >
                Total bps: {totalBps} / 10,000
              </p>
            </div>

            <div className="space-y-6">
              {form.milestones.map((m, i) => (
                <div
                  key={i}
                  className="border border-outline-variant rounded-xl p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-label-md text-on-surface font-semibold">
                      Milestone {i + 1}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-label-sm text-on-surface-variant">
                        Bps:
                      </span>
                      <input
                        type="number"
                        value={form.milestoneBps[i]}
                        onChange={(e) => { handleBpsChange(i, e.target.value); }}
                        className="w-20 bg-surface-container-lowest border border-outline rounded-xl px-3 py-1 text-label-md text-on-surface focus:border-primary outline-none"
                      />
                      <span className="text-label-sm text-on-surface-variant">
                        ({(((form.milestoneBps[i] ?? 0) / 10000) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <Input
                    label="Title"
                    value={m.title}
                    onChange={(e) =>
                      { handleMilestoneField(i, 'title', e.target.value); }
                    }
                    required
                  />
                  <div>
                    <label className="block text-label-md text-on-surface mb-2">
                      Description
                    </label>
                    <textarea
                      value={m.description}
                      onChange={(e) =>
                        { handleMilestoneField(i, 'description', e.target.value); }
                      }
                      rows={3}
                      className="w-full bg-surface-container-lowest border border-outline rounded-xl px-4 py-3 text-body-md text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none resize-y"
                    />
                  </div>
                  <Input
                    label="Deliverable date (optional)"
                    value={m.deliverableDate}
                    onChange={(e) =>
                      { handleMilestoneField(
                        i,
                        'deliverableDate',
                        e.target.value,
                      ); }
                    }
                    type="date"
                  />
                </div>
              ))}
            </div>

            {error && <p className="text-label-sm text-error">{error}</p>}

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => { setStep(2); }}>
                Back
              </Button>
              <Button
                variant="primary"
                onClick={() => { void handleSubmit(); }}
                disabled={loading || totalBps !== 10000}
              >
                {loading ? 'Creating draft...' : 'Create draft project'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
