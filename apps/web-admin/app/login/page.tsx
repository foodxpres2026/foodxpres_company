import LoginForm from './login-form'

// The proxy adds a fresh CSP nonce to every response. Keep the HTML dynamic so
// cached markup cannot contain scripts with a nonce from a previous request.
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return <LoginForm />
}
