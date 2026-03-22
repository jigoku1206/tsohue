'use client'

import dynamic from 'next/dynamic'

const DemoDashboard = dynamic(
  () => import('./demo-dashboard').then((m) => ({ default: m.DemoDashboard })),
  { ssr: false }
)

export function DemoWrapper() {
  return <DemoDashboard />
}
