import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session?.user) redirect('/auth/sign-in')
  return <>{children}</>
}
