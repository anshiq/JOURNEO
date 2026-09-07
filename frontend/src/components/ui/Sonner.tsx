import { Toaster as Sonner } from 'sonner'

function Toaster({ ...props }: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      theme="light"
      toastOptions={{
        style: {
          borderRadius: 0,
          border: '1px solid hsl(var(--border-strong))',
          background: 'hsl(var(--background))',
          color: 'hsl(var(--foreground))',
          fontFamily: 'var(--font-sans)',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
