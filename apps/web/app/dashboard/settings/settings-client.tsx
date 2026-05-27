'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface Wallet {
  id: string
  address: string
  isPrimary: boolean
  verifiedAt: string
}

interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  createdAt: string
}

interface SettingsClientProps {
  user: User
  wallets: Wallet[]
  emailPreferences: Record<string, boolean>
}

const EMAIL_TEMPLATES: { key: string; label: string; essential: boolean }[] = [
  { key: 'WELCOME', label: 'Welcome', essential: true },
  { key: 'CONTRIBUTION_RECEIVED', label: 'Contribution received', essential: false },
  { key: 'MILESTONE_UPDATED', label: 'Milestone updated', essential: false },
  { key: 'MILESTONE_VOTE_OPEN', label: 'Milestone vote open', essential: true },
  { key: 'MILESTONE_VOTE_COMING_SOON', label: 'Milestone vote coming soon', essential: true },
  { key: 'MILESTONE_VOTE_OUTCOME', label: 'Milestone vote outcome', essential: true },
  { key: 'MILESTONE_CLAIMED', label: 'Milestone claimed', essential: true },
  { key: 'ORG_VERIFIED', label: 'Organization verified', essential: true },
  { key: 'ORG_REJECTED', label: 'Organization rejected', essential: true },
  { key: 'ADMIN_INVITATION', label: 'Admin invitation', essential: true },
]

export function SettingsClient({ user, wallets, emailPreferences }: SettingsClientProps) {
  const [name, setName] = useState(user.name ?? '')
  const [image, setImage] = useState(user.image ?? '')
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState(emailPreferences)
  const [walletList, setWalletList] = useState(wallets)

  async function saveProfile() {
    setSaving(true)
    const res = await fetch('/api/users/me/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name || undefined, image: image || undefined }),
    })
    setSaving(false)
    if (!res.ok) {
      alert('Failed to save profile')
    }
  }

  async function togglePreference(template: string, unsubscribed: boolean) {
    const res = await fetch('/api/users/me/email-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template, unsubscribed }),
    })
    if (res.ok) {
      setPrefs((prev) => ({ ...prev, [template]: unsubscribed }))
    }
  }

  async function setPrimary(address: string) {
    const res = await fetch(`/api/auth/wallet/${address}/primary`, {
      method: 'PATCH',
    })
    if (res.ok) {
      setWalletList((prev) =>
        prev.map((w) => ({ ...w, isPrimary: w.address === address }))
      )
    } else {
      alert('Failed to set primary wallet')
    }
  }

  async function unlinkWallet(address: string) {
    if (!confirm('Are you sure you want to unlink this wallet?')) return
    const res = await fetch(`/api/auth/wallet/${address}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setWalletList((prev) => prev.filter((w) => w.address !== address))
    } else {
      alert('Failed to unlink wallet')
    }
  }

  function truncateAddress(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => { setName(e.target.value); }} />
          <Input label="Profile Image URL" value={image} onChange={(e) => { setImage(e.target.value); }} />
          <div className="flex items-center justify-between">
            <p className="text-label-sm text-on-surface-variant">Email</p>
            <p className="text-body-md text-on-surface">{user.email}</p>
          </div>
          <Button onClick={() => void saveProfile()} disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Linked Wallets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {walletList.length === 0 ? (
            <p className="text-label-md text-on-surface-variant">No wallets linked.</p>
          ) : (
            walletList.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between p-4 rounded-xl border border-outline-variant bg-surface-container-low"
              >
                <div>
                  <p className="text-label-md text-on-surface font-medium">
                    {truncateAddress(w.address)}
                  </p>
                  {w.isPrimary && (
                    <span className="text-label-sm text-primary">Primary</span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!w.isPrimary && (
                    <Button variant="outline" size="sm" onClick={() => { void setPrimary(w.address) }}>
                      Set Primary
                    </Button>
                  )}
                  <Button variant="destructive" size="sm" onClick={() => { void unlinkWallet(w.address) }}>
                    Unlink
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {EMAIL_TEMPLATES.map((t) => (
            <div key={t.key} className="flex items-center justify-between py-2">
              <div>
                <p className="text-body-md text-on-surface">{t.label}</p>
                {t.essential && (
                  <p className="text-label-sm text-on-surface-variant">Essential — cannot unsubscribe</p>
                )}
              </div>
              {t.essential ? (
                <span className="text-label-sm text-primary">Subscribed</span>
              ) : (
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={!prefs[t.key]}
                    onChange={(e) => { void togglePreference(t.key, !e.target.checked) }}
                  />
                  <div className="relative w-11 h-6 bg-surface-variant peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                  <span className="ms-3 text-label-sm text-on-surface-variant">
                    {prefs[t.key] ? 'Unsubscribed' : 'Subscribed'}
                  </span>
                </label>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
