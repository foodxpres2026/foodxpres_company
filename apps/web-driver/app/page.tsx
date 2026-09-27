import LoginPanel from './login-panel'
import DriverDashboard from './driver-dashboard'
import { getDriverSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const user = await getDriverSession()
  return user ? <DriverDashboard user={user} /> : <LoginPanel />
}
