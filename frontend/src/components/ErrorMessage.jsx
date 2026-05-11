export default function ErrorMessage({ message, onRetry }) {
  return (
    <div role="alert" className="p-6 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200 text-red-700">
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
        <p className="font-medium text-sm">{message || 'Não foi possível carregar os dados.'}</p>
      </div>
      <div className="mt-3">
        <button
          onClick={() => (onRetry ? onRetry() : window.location.reload())}
          className="text-xs text-neutral-500 hover:text-neutral-700 underline"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
