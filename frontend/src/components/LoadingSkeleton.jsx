export default function LoadingSkeleton({ lines = 3 }) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="A carregar conteúdo"
      className="animate-pulse space-y-4 p-6 max-w-6xl mx-auto"
    >
      <div className="h-6 bg-neutral-200 rounded w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-neutral-100 rounded" style={{ width: `${85 - i * 10}%` }} />
      ))}
    </div>
  )
}
