import Link from 'next/link'
import { Progress } from '@/components/ui/progress'
import { StatusDot } from '@/components/ui/status-dot'

interface ProjectCardProps {
  slug: string
  title: string
  summary: string
  pictures: string[]
  targetAmount: string
  totalRaised: string
  status: 'LIVE' | 'COMPLETED' | 'PAUSED'
}

export function ProjectCard({
  slug,
  title,
  summary,
  pictures,
  targetAmount,
  totalRaised,
  status,
}: ProjectCardProps) {
  const target = parseFloat(targetAmount)
  const raised = parseFloat(totalRaised)
  const progress = target > 0 ? (raised / target) * 100 : 0
  const isFunded = target > 0 && raised >= target
  const firstPicture = pictures.length > 0 ? pictures[0] : null

  const formatUsd = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  return (
    <Link href={`/projects/${slug}`} className="block group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none rounded-lg">
      <div className="rounded-lg border border-outline-variant bg-surface overflow-hidden hover:shadow-md transition-shadow">
        <div className="aspect-[16/9] bg-surface-container-high relative">
          {firstPicture ? (
            <img
              src={firstPicture}
              alt={title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-surface-variant/30">
              <span className="material-symbols-outlined text-[48px]">image</span>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <StatusDot
              status={status === 'LIVE' ? 'live' : status === 'COMPLETED' ? 'success' : 'pending'}
            />
            <span className="text-label-sm text-on-surface-variant">
              {status === 'LIVE' ? 'Live' : status === 'COMPLETED' ? 'Completed' : 'Paused'}
            </span>
            {isFunded && (
              <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-semibold bg-tertiary-container/20 text-tertiary">
                Funded
              </span>
            )}
          </div>

          <h3 className="text-body-lg font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
            {title}
          </h3>
          <p className="text-label-md text-on-surface-variant mt-1 line-clamp-2">
            {summary}
          </p>

          <div className="mt-4">
            <Progress value={Math.min(progress, 100)} />
            <div className="flex justify-between mt-2">
              <span className="text-label-sm font-semibold text-on-surface">
                {formatUsd(raised)}
              </span>
              <span className="text-label-sm text-on-surface-variant">
                {formatUsd(target)} target
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
