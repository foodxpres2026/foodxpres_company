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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="FoodXpres"
        style={{ width: size, height: size }}
        className="object-contain flex-shrink-0"
      />
      {conTexto && (
        <span
          className="font-black tracking-tight leading-none"
          style={{ fontSize: size * 0.42 }}
        >
          FOOD<span className="text-brand">X</span>PRES
        </span>
      )}
    </div>
  )

  if (linkeado) {
    return <Link href="/">{contenido}</Link>
  }

  return contenido
}