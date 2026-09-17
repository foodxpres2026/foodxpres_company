export default function FondoDecorativo() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Íconos dispersos, sutiles */}
      <svg
        className="absolute top-[8%] left-[5%] w-24 h-24 text-brand opacity-[0.05]"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2L2 22h20L12 2zm0 4l6 12H6l6-12z" />
      </svg>

      <svg
        className="absolute top-[20%] right-[8%] w-20 h-20 text-brand opacity-[0.05]"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M20 10V8h-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v6a4 4 0 004 4h2v4h2v-4h2a4 4 0 004-4h2a2 2 0 002-2zm-2 0h-2v-2h2v2zM4 6h12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
      </svg>

      <svg
        className="absolute bottom-[15%] left-[10%] w-24 h-24 text-brand opacity-[0.05]"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M18 8h1a4 4 0 010 8h-1v2H4V8h14zm0 2v4h1a2 2 0 000-4h-1zM2 20h20v2H2z" />
      </svg>

      <svg
        className="absolute bottom-[25%] right-[12%] w-28 h-28 text-brand opacity-[0.04]"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
      </svg>

      <svg
        className="absolute top-[45%] left-[45%] w-32 h-32 text-brand opacity-[0.03] hidden md:block"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C8 2 5 5 5 9h14c0-4-3-7-7-7zM5 11v2h14v-2H5zM5 15v2h14v-2H5zM5 19h14v2H5z" />
      </svg>

      <svg
        className="absolute top-[70%] left-[25%] w-20 h-20 text-brand opacity-[0.04]"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M18 8h1a4 4 0 010 8h-1v2H4V8h14zm0 2v4h1a2 2 0 000-4h-1zM2 20h20v2H2z" />
      </svg>

      <svg
        className="absolute top-[12%] right-[35%] w-16 h-16 text-brand opacity-[0.04]"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M16 6V4a4 4 0 00-8 0v2H2v16h20V6h-6zM10 4a2 2 0 014 0v2h-4V4z" />
      </svg>

      {/* Hoja Pucallpa (arriba) */}
      <svg
        className="absolute top-[4%] left-[35%] w-20 h-20 text-brand opacity-[0.03]"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C6 2 2 6 2 12s4 10 10 10 10-4 10-10S18 2 12 2zm0 18c-4 0-8-4-8-8s4-8 8-8 8 4 8 8-4 8-8 8z" />
        <path
          d="M12 6v12M8 10l4-4 4 4M8 14l4 4 4-4"
          stroke="currentColor"
          fill="none"
          strokeWidth="0.5"
        />
      </svg>

      {/* Hoja Pucallpa (abajo) */}
      <svg
        className="absolute bottom-[3%] left-[55%] w-24 h-24 text-brand opacity-[0.03]"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C6 2 2 6 2 12s4 10 10 10 10-4 10-10S18 2 12 2zm0 18c-4 0-8-4-8-8s4-8 8-8 8 4 8 8-4 8-8 8z" />
        <path
          d="M12 6v12M8 10l4-4 4 4M8 14l4 4 4-4"
          stroke="currentColor"
          fill="none"
          strokeWidth="0.5"
        />
      </svg>

      {/* Delfín (referencia al río Ucayali) */}
      <svg
        className="absolute top-[55%] left-[3%] w-28 h-28 text-brand opacity-[0.03]"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C8 2 4 6 4 10c0 3 1 5 3 6l-1 4h2l1-3c1 .5 2 .5 3 0l1 3h2l-1-4c2-1 3-3 3-6 0-4-4-8-8-8z" />
      </svg>

      {/* Río (ondas inferiores) */}
      <svg
        className="absolute bottom-0 left-0 w-full h-32 text-brand opacity-[0.03]"
        viewBox="0 0 1440 150"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0,80 C240,120 480,40 720,80 C960,120 1200,40 1440,80"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="M0,100 C240,140 480,60 720,100 C960,140 1200,60 1440,100"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M0,120 C240,160 480,80 720,120 C960,160 1200,80 1440,120"
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    </div>
  )
}