import { isProblem } from '@shared/api/problem'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'

const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (count, error) => !isProblem(error, 401) && !isProblem(error, 404) && count < 2,
    },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="bottom-center" richColors />
    </QueryClientProvider>
  )
}
