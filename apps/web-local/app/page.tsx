import LoginPanel from './login-panel'
import LocalDashboard from './local-dashboard'
import { getLocalSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getLocalSession()
  return user ? <LocalDashboard user={user} /> : <LoginPanel />
}
