import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * App-wide toasts and confirm dialogs, replacing the browser's alert() and confirm().
 *   const toast = useToast();     toast('Saved')  /  toast('Could not save', 'error')
 *   const confirm = useConfirm(); if (await confirm({ title: 'Delete?', danger: true })) …
 */

type Tone = 'success' | 'error' | 'info'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface FeedbackApi {
  toast: (message: string, tone?: Tone) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const FeedbackContext = createContext<FeedbackApi | null>(null)

function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext)
  if (!ctx) throw new Error('FeedbackProvider is missing')
  return ctx
}

export const useToast = () => useFeedback().toast
export const useConfirm = () => useFeedback().confirm

interface ToastItem {
  id: number
  message: string
  tone: Tone
}

const TONES: Record<Tone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'border-emerald-500/40 text-emerald-200' },
  error: { icon: XCircle, className: 'border-rose-500/45 text-rose-200' },
  info: { icon: Info, className: 'border-[#3a3e4d] text-[#e4e6eb]' },
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null)
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), [])

  const toast = useCallback(
    (message: string, tone: Tone = 'info') => {
      const id = nextId.current++
      setToasts((ts) => [...ts.slice(-3), { id, message, tone }])
      setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 3000)
    },
    [dismiss],
  )

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setDialog({ ...options, resolve })),
    [],
  )

  const close = (ok: boolean) => {
    dialog?.resolve(ok)
    setDialog(null)
  }

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const { icon: Icon, className } = TONES[t.tone]
          return (
            <div
              key={t.id}
              role={t.tone === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-[#1f2128] px-3.5 py-2.5 text-xs font-medium shadow-2xl shadow-black/50 ${className}`}
            >
              <Icon size={15} className="mt-px shrink-0" />
              <span className="min-w-0 flex-1 leading-relaxed">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="shrink-0 rounded p-0.5 text-[#7f8699] hover:text-white" aria-label="Dismiss">
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>

      {dialog && <ConfirmDialog options={dialog} onClose={close} />}
    </FeedbackContext.Provider>
  )
}

function ConfirmDialog({ options, onClose }: { options: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={() => onClose(false)}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-2xl border border-[#343846] bg-[#1f2128] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              options.danger ? 'bg-rose-500/15 text-rose-400' : 'bg-[#3d6ccc]/15 text-[#8fb2f5]'
            }`}
          >
            <AlertTriangle size={17} />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-sm font-semibold text-white">
              {options.title}
            </h2>
            {options.message && <p className="mt-1 text-xs leading-relaxed text-[#9aa1b2]">{options.message}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => onClose(false)}
            className="rounded-lg border border-[#343846] bg-[#252831] px-3.5 py-1.5 text-xs font-medium text-[#e4e6eb] hover:bg-[#2d303b]"
          >
            {options.cancelLabel ?? 'Cancel'}
          </button>
          <button
            ref={confirmRef}
            onClick={() => onClose(true)}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white ${
              options.danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-[#3d6ccc] hover:bg-[#2f5cb8]'
            }`}
          >
            {options.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
