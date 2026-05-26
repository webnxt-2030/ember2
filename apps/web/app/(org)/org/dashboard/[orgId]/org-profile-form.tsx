'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  orgId: string
  initialTitle: string
  initialDescription: string
  initialLogoUrl: string
  initialWebsite: string
}

export function OrgProfileForm({
  orgId,
  initialTitle,
  initialDescription,
  initialLogoUrl,
  initialWebsite,
}: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl)
  const [website, setWebsite] = useState(initialWebsite)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await fetch(`/api/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          logoUrl: logoUrl || null,
          website: website || null,
        }),
      })
      const data = (await res.json()) as { detail?: string; title?: string }
      if (!res.ok) {
        setError(data.detail ?? data.title ?? 'Failed to save changes')
        return
      }
      setSuccess(true)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-6">
          <Input
            label="Organization name"
            value={title}
            onChange={(e) => { setTitle(e.target.value); }}
            required
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => { setDescription(e.target.value); }}
          />
          <Input
            label="Logo URL (optional)"
            value={logoUrl}
            onChange={(e) => { setLogoUrl(e.target.value); }}
            type="url"
          />
          <Input
            label="Website (optional)"
            value={website}
            onChange={(e) => { setWebsite(e.target.value); }}
            type="url"
          />
          {error && <p className="text-label-sm text-error">{error}</p>}
          {success && <p className="text-label-sm text-tertiary">Changes saved.</p>}
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save changes'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
