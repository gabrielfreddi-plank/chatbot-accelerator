'use client'

import { createContext, useContext } from 'react'

interface UIActionContextValue {
  sendMessage: (content: string) => void
}

export const UIActionContext = createContext<UIActionContextValue>({ sendMessage: () => {} })

export function useUIActions() {
  return useContext(UIActionContext)
}
