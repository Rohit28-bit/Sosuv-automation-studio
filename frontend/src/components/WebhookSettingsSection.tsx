import { Bell, CheckCircle2, Code2, Send } from 'lucide-react'
import { useState } from 'react'
import type { FailureWebhook, WebhookProvider } from '../types'

export const DEFAULT_FAILURE_WEBHOOK: FailureWebhook = {
  enabled: false,
  provider: 'slack',
  webhookUrl: '',
  channel: '',
  notifyOn: 'failure',
  includeLogs: true,
}

const PROVIDERS: {
  id: WebhookProvider
  name: string
  hint: string
  placeholder: string
}[] = [
  {
    id: 'slack',
    name: 'Slack',
    hint: 'Incoming Webhook',
    placeholder: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX',
  },
  {
    id: 'teams',
    name: 'MS Teams',
    hint: 'Workflows / Connector',
    placeholder: 'https://yourorg.webhook.office.com/webhookb2/...',
  },
  {
    id: 'custom',
    name: 'Custom JSON',
    hint: 'HTTP POST',
    placeholder: 'https://api.example.com/webhooks/workflow-alert',
  },
]

export function WebhookSettingsSection({
  value,
  workflowName,
  onChange,
}: {
  value: FailureWebhook
  workflowName: string
  onChange: (next: FailureWebhook) => void
}) {
  const [testStatus, setTestStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const [showPayload, setShowPayload] = useState(false)

  const activeProvider = PROVIDERS.find((p) => p.id === value.provider) ?? PROVIDERS[0]
  const patch = (partial: Partial<FailureWebhook>) => onChange({ ...value, ...partial })

  const handleTest = () => {
    if (!value.webhookUrl.trim().startsWith('http')) {
      setTestStatus('error')
      return
    }
    setTestStatus('sent')
    setTimeout(() => setTestStatus('idle'), 3000)
  }

  const samplePayload =
    value.provider === 'slack'
      ? {
          channel: value.channel || '#workflow-alerts',
          text: `🚨 Workflow Failed: ${workflowName || 'Untitled workflow'}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Workflow Failed:* ${workflowName || 'Untitled workflow'}\n*Failed Node:* Run SQL\n*Error:* Connection timeout after 60s`,
              },
            },
          ],
        }
      : value.provider === 'teams'
        ? {
            '@type': 'MessageCard',
            themeColor: 'EF4444',
            summary: `Workflow Failed: ${workflowName || 'Untitled workflow'}`,
            sections: [
              {
                activityTitle: `🚨 Workflow Failed: ${workflowName || 'Untitled workflow'}`,
                facts: [
                  { name: 'Failed Node', value: 'Run SQL' },
                  { name: 'Status', value: 'Failed' },
                ],
              },
            ],
          }
        : {
            event: value.notifyOn === 'always' ? 'workflow.finished' : 'workflow.failed',
            workflowName: workflowName || 'Untitled workflow',
            status: 'failed',
            failedNode: 'Run SQL',
            includeLogs: Boolean(value.includeLogs),
          }

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between rounded-xl border border-[#2c2f3b] bg-[#252831] px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3d6ccc]/15 text-[#8fb2f5]">
            <Bell size={15} />
          </div>
          <div>
            <div className="text-xs font-semibold text-white">Failure notifications</div>
            <div className="text-[11px] text-[#7f8699]">Send a webhook alert when this workflow fails</div>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value.enabled}
          onClick={() => patch({ enabled: !value.enabled })}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            value.enabled ? 'bg-emerald-500' : 'bg-[#363a47]'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
              value.enabled ? 'left-[18px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* Provider selector */}
      <div>
        <span className="mb-1.5 block text-xs font-medium text-[#b5bac9]">Notification channel</span>
        <div className="grid grid-cols-3 gap-2">
          {PROVIDERS.map((p) => {
            const selected = value.provider === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => patch({ provider: p.id })}
                className={`rounded-xl border p-2.5 text-left transition-all ${
                  selected
                    ? 'border-[#3d6ccc] bg-[#3d6ccc]/10 text-white'
                    : 'border-[#2c2f3b] bg-[#252831] text-[#9aa1b2] hover:border-[#3f4456] hover:text-white'
                }`}
              >
                <div className="text-xs font-semibold">{p.name}</div>
                <div className="mt-0.5 text-[10px] text-[#7f8699]">{p.hint}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Webhook URL */}
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-[#b5bac9]">
          {activeProvider.name} Webhook URL <span className="text-[#8fb2f5]">*</span>
        </span>
        <input
          type="url"
          value={value.webhookUrl}
          onChange={(e) => {
            patch({ webhookUrl: e.target.value })
            if (testStatus !== 'idle') setTestStatus('idle')
          }}
          placeholder={activeProvider.placeholder}
          className="w-full rounded-lg border border-[#343846] bg-[#18191e] px-3 py-2 font-mono text-xs text-white placeholder-[#686f82] outline-none focus:border-[#3d6ccc]"
        />
      </label>

      {/* Optional Slack channel override */}
      {value.provider === 'slack' && (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[#b5bac9]">Channel override (optional)</span>
          <input
            type="text"
            value={value.channel ?? ''}
            onChange={(e) => patch({ channel: e.target.value })}
            placeholder="#ops-alerts"
            className="w-full rounded-lg border border-[#343846] bg-[#18191e] px-3 py-2 text-xs text-white placeholder-[#686f82] outline-none focus:border-[#3d6ccc]"
          />
        </label>
      )}

      {/* Trigger & Log options */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-[#b5bac9]">Trigger on</span>
          <select
            value={value.notifyOn}
            onChange={(e) => patch({ notifyOn: e.target.value as 'failure' | 'always' })}
            className="w-full rounded-lg border border-[#343846] bg-[#18191e] px-2.5 py-2 text-xs text-white outline-none focus:border-[#3d6ccc]"
          >
            <option value="failure" className="bg-[#1f2128]">On failure only</option>
            <option value="always" className="bg-[#1f2128]">Failure &amp; completion</option>
          </select>
        </label>

        <div className="flex items-end">
          <label className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-[#2c2f3b] bg-[#252831] px-3 py-2 text-xs text-[#e4e6eb]">
            <input
              type="checkbox"
              checked={Boolean(value.includeLogs)}
              onChange={(e) => patch({ includeLogs: e.target.checked })}
              className="h-3.5 w-3.5 rounded accent-[#3d6ccc]"
            />
            <span>Include error logs</span>
          </label>
        </div>
      </div>

      {/* Test webhook + payload preview */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#2c2f3b] pt-3">
        <button
          type="button"
          onClick={() => setShowPayload((s) => !s)}
          className="flex items-center gap-1.5 text-[11px] font-medium text-[#8f96a8] hover:text-white"
        >
          <Code2 size={13} />
          {showPayload ? 'Hide payload preview' : 'Preview JSON payload'}
        </button>

        <div className="flex items-center gap-2">
          {testStatus === 'sent' && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-400">
              <CheckCircle2 size={12} /> Test alert queued (mock)
            </span>
          )}
          {testStatus === 'error' && (
            <span className="text-[11px] text-rose-400">Enter a valid http(s) URL</span>
          )}
          <button
            type="button"
            onClick={handleTest}
            className="flex items-center gap-1.5 rounded-lg border border-[#343846] bg-[#252831] px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:border-[#3d6ccc]/60 hover:bg-[#2d303b]"
          >
            <Send size={12} className="text-[#8fb2f5]" />
            Test webhook
          </button>
        </div>
      </div>

      {showPayload && (
        <pre className="max-h-36 overflow-auto rounded-lg border border-[#2c2f3b] bg-[#131418] p-2.5 font-mono text-[11px] text-[#b5bac9]">
          {JSON.stringify(samplePayload, null, 2)}
        </pre>
      )}
    </div>
  )
}

