import { Suspense } from 'react'
import ReportarClientPage from './reportar-client'

export const dynamic = 'force-dynamic'

export default function ReportarPage() {
  return (
    <Suspense fallback={<div className="p-6 text-white">Carregando...</div>}>
      <ReportarClientPage />
    </Suspense>
  )
}