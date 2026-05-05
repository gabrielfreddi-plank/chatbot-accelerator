'use client'

import dynamic from 'next/dynamic'

const AppShell = dynamic(() => import('@/components/app-shell').then((m) => m.AppShell), {
  ssr: false,
})

export default function Home() {
  return (
    <main className="flex flex-1 overflow-hidden">
      <AppShell />
    </main>
  )
}
