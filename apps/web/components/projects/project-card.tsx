'use client'

import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { StatusDot } from '@/components/ui/status-dot'
import { cn } from '@/lib/cn'

type ProjectStatus = 'DRAFT' | 'LIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'

interface ProjectCardProps {
  project: {
    id: string
    slug: string
    title: string
    summary: string
    pictures: string[]
    targetAmount: string
    totalRaised: string
    status: ProjectStatus
    fundingDeadline: string | null
    rewardCurveType: string
    organization: {
      id: string
      slug: string
      title: string
      logoUrl: string | null
      verifiedStatus: 'PENDING' | 'VERIFIED' | 'REJECTED'
    }
    milestoneCount: number
    backersCount: number
  }
  className?: string
}

function FundingProgress({ target, raised }: { target: string; raised: string }) {
  const targetNum = parseFloat(target)
  const raisedNum = parseFloat(raised)
  const percent = targetNum > 0 ? Math.min(100, (raisedNum / targetNum) * 100) : 0

  return (
    <div className="mt-3">
      <Progress value={percent} />
      <p className="text-label-sm text-on-surface-variant mt-2">
        {percent.toFixed(0)}% funded · {raisedNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} raised
      </p>
    </div>
  )
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  if (status === 'LIVE') {
    return (
      <div className="flex items-center gap-1.5">
        <StatusDot status="live" />
        <span className="text-label-sm text-on-surface-variant">Live</span>
      </div>
    )
  }
  if (status === 'COMPLETED') {
    return <Badge status="completed">Completed</Badge>
  }
  if (status === 'PAUSED') {
    return <Badge status="pending">Paused</Badge>
  }
  if (status === 'CANCELLED') {
    return <Badge status="failed">Cancelled</Badge>
  }
  return null
}

function DeadlineLabel({ deadline }: { deadline: string | null }) {
  if (!deadline) return null
  const now = new Date()
  const end = new Date(deadline)
  const diffMs = end.getTime() - now.getTime()
  if (diffMs <= 0) return <span className="text-label-sm text-on-surface-variant">Ended</span>
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (days === 1) return <span className="text-label-sm text-on-surface-variant">1 day left</span>
  return <span className="text-label-sm text-on-surface-variant">{days} days left</span>
}

export function ProjectCard({ project, className }: ProjectCardProps) {
  const coverImage = project.pictures?.[0]
  const progress = parseFloat(project.targetAmount) > 0
    ? Math.min(100, (parseFloat(project.totalRaised) / parseFloat(project.targetAmount)) * 100)
    : 0

  return (
    <Link href={`/projects/${project.slug}`} className={cn('block group', className)}>
      <Card className="overflow-hidden p-0 transition-shadow hover:shadow-md">
        {/* Cover image or gradient fallback */}
        <div className="relative h-40 bg-surface-container-low">
          {coverImage ? (
            <img
              src={coverImage}
              alt={project.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary-container/40" />
          )}
          <div className="absolute top-3 left-3">
            <StatusBadge status={project.status} />
          </div>
        </div>

        {/* Card body */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-2">
            {project.organization.logoUrl ? (
              <img
                src={project.organization.logoUrl}
                alt={project.organization.title}
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined text-on-surface-variant text-sm">
                account_balance
              </span>
            )}
            <span className="text-label-sm text-on-surface-variant">{project.organization.title}</span>
            {project.organization.verifiedStatus === 'VERIFIED' && (
              <span
                className="material-symbols-outlined text-tertiary text-sm"
                aria-label="Verified"
              >
                shield_locked
              </span>
            )}
          </div>

          <h3 className="text-headline-md text-on-surface group-hover:text-primary transition-colors">
            {project.title}
          </h3>

          <p className="text-label-sm text-on-surface-variant mt-1 line-clamp-2">
            {project.summary}
          </p>

          <FundingProgress target={project.targetAmount} raised={project.totalRaised} />

          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-outline-variant">
            <span className="text-label-sm text-on-surface-variant">
              {project.backersCount.toLocaleString()} {project.backersCount === 1 ? 'backer' : 'backers'}
            </span>
            <span className="text-on-surface-variant">·</span>
            <span className="text-label-sm text-on-surface-variant">
              {project.milestoneCount} milestones
            </span>
            {project.fundingDeadline && (
              <>
                <span className="text-on-surface-variant">·</span>
                <DeadlineLabel deadline={project.fundingDeadline} />
              </>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}