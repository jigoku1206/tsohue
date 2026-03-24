import { redirect } from 'next/navigation'
import { HomeContent } from './home-content'

export default function Home() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    redirect('/dashboard')
  }

  return <HomeContent />
}
