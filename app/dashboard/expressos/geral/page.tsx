import { Suspense } from 'react'
import ExpressosGeralClientPage from './expressos-geral-client'

export const dynamic = 'force-dynamic'

export default function ExpressosGeralPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ExpressosGeralClientPage />
    </Suspense>
  )
}