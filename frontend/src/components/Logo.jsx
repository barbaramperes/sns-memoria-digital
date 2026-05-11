import { Link } from 'react-router-dom'

export default function Logo({ light = false, size = 'md' }) {
  const sizes = {
    sm: { icon: 'w-7 h-7', text: 'text-[.85rem]', gap: 'gap-2' },
    md: { icon: 'w-9 h-9', text: 'text-base', gap: 'gap-2.5' },
    lg: { icon: 'w-11 h-11', text: 'text-xl', gap: 'gap-3' },
  }
  const s = sizes[size] || sizes.md

  return (
    <Link to="/" className={`inline-flex items-center ${s.gap} group`}>
      <div className={`${s.icon} relative`}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="20" cy="20" r="20" className="fill-red-600" />
          <path
            d="M6 22h6l3-8 4 16 3-8h6l2-4h4"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="32" cy="12" r="4" className="fill-white/30" />
          <circle cx="32" cy="12" r="2" className="fill-white" />
        </svg>
      </div>
      <div className={`${s.text} font-extrabold tracking-tight leading-tight ${light ? 'text-white' : 'text-neutral-900'}`}>
        SNS Memória <span className="text-red-600">Digital</span>
      </div>
    </Link>
  )
}
