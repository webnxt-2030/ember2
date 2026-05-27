'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export function CreateOrgForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [receivingWallet, setReceivingWallet] = useState('')
  const [ownerEmails, setOwnerEmails] = useState('')  // comma-separated
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Auto-generate slug from name
  const handleNameChange = (v: string) => {
    setName(v)
    setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const emails = ownerEmails.split(',').map((s) => s.trim()).filter(Boolean)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description: description || undefined,
          website: website || undefined,
          receivingWallet,
          ownerEmails: emails,
        }),
      })
      const data = (await res.json()) as { detail?: string; title?: string }
      if (!res.ok) {
        setError(data.detail ?? data.title ?? 'Failed to create organization')
        return
      }
      router.push('/admin/organizations')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          <Input
            label="Organization name"
            value={name}
            onChange={(e) => { handleNameChange(e.target.value); }}
            required
          />
          <Input
            label="Slug (URL identifier)"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); }}
            required
          />
          <Input
            label="Description (optional)"
            value={description}
            onChange={(e) => { setDescription(e.target.value); }}
          />
          <Input
            label="Website (optional)"
            value={website}
            onChange={(e) => { setWebsite(e.target.value); }}
            type="url"
          />
          <Input
            label="Receiving wallet address"
            value={receivingWallet}
            onChange={(e) => { setReceivingWallet(e.target.value); }}
            placeholder="0x..."
            required
          />
          <Input
            label="Owner emails (comma-separated)"
            value={ownerEmails}
            onChange={(e) => { setOwnerEmails(e.target.value); }}
            {...(error ? { error } : {})}
            required
          />
          {error && <p className="text-label-sm text-error">{error}</p>}
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create organization'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
