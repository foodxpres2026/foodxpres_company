import Link from 'next/link'

interface LogoProps {
  size?: number
  conTexto?: boolean
  linkeado?: boolean
  className?: string
}

export default function Logo({
  size = 40,
  conTexto = false,
  linkeado = false,
  className = '',
}: LogoProps) {
  const contenido = (
    <div className={`flex items-center gap-2 ${className}`}>
      {conTexto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/logo.png" alt="FoodXpres" style={{ width: size * 2.2, height: size * 1.5 }} className="object-contain flex-shrink-0" />
      ) : (
        <span className="foodxpres-logo-mark" style={{ width: size, height: size }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-mark.png" alt="FoodXpres" />
        </span>
      )}
    </div>
  )

  if (linkeado) {
    return <Link href="/">{contenido}</Link>
  }

  return contenido
}
