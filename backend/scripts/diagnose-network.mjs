const host = 'ep-wispy-meadow-aww38b80-pooler.c-12.us-east-1.aws.neon.tech'

console.log('🔍 DIAGNÓSTICO DE RED\n')
console.log('Host objetivo:', host, '\n')

// 1. DNS
console.log('1️⃣  Resolviendo DNS...')
try {
  const dns = await import('dns/promises')
  const addresses = await dns.lookup(host, { all: true })
  console.log('   ✅ DNS OK:', addresses)
} catch (err) {
  console.error('   ❌ DNS error:', err.message)
}

// 2. HTTPS a Neon
console.log('\n2️⃣  Probando HTTPS al host de Neon...')
try {
  const res = await fetch(`https://${host}/`, {
    method: 'HEAD',
    signal: AbortSignal.timeout(5000),
  })
  console.log('   ✅ HTTPS OK. Status:', res.status)
} catch (err) {
  console.error('   ❌ HTTPS error:', err.message)
  console.error('   Causa:', err.cause?.message)
  console.error('   Code:', err.cause?.code)
}

// 3. HTTPS a Google (para descartar red general)
console.log('\n3️⃣  Probando HTTPS a google.com...')
try {
  const res = await fetch('https://www.google.com', {
    method: 'HEAD',
    signal: AbortSignal.timeout(5000),
  })
  console.log('   ✅ Google OK. Status:', res.status)
} catch (err) {
  console.error('   ❌ Google error:', err.message)
}

// 4. HTTPS a Neon API
console.log('\n4️⃣  Probando HTTPS a neon.tech...')
try {
  const res = await fetch('https://neon.tech', {
    method: 'HEAD',
    signal: AbortSignal.timeout(5000),
  })
  console.log('   ✅ neon.tech OK. Status:', res.status)
} catch (err) {
  console.error('   ❌ neon.tech error:', err.message)
  console.error('   Causa:', err.cause?.message)
}

console.log('\n✅ Diagnóstico completo')