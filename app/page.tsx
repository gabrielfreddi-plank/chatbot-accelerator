'use client'

import dynamic from 'next/dynamic'

const ChatApp = dynamic(() => import('@/components/chat/chat-app').then((m) => m.ChatApp), {
  ssr: false,
})

export default function Home() {
  return (
    <main className="flex flex-1 overflow-hidden">
      <ChatApp />
    </main>
  )
}
