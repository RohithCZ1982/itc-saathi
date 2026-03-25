// src/components/dashboard/OnboardingFlow.tsx
import Link from 'next/link'
import { CheckCircle2, Circle, UserCircle, Upload } from 'lucide-react'

interface Props {
  profileComplete: boolean
  hasInvoices: boolean
}

export function OnboardingFlow({ profileComplete, hasInvoices }: Props) {
  const steps = [
    {
      number: 1,
      title: 'Complete your profile',
      description: 'Add your GSTIN and business name so ITC claims are accurate.',
      href: '/settings',
      cta: 'Go to Settings',
      icon: UserCircle,
      done: profileComplete,
    },
    {
      number: 2,
      title: 'Upload your first invoice',
      description: 'Upload a PDF or image of a GST invoice for cement, steel, or other construction materials.',
      href: '/upload',
      cta: 'Upload Invoice',
      icon: Upload,
      done: hasInvoices,
    },
  ]

  const allDone = steps.every((s) => s.done)

  if (allDone) return null

  return (
    <div className="card p-6">
      <div className="mb-5">
        <h2 className="font-display font-bold text-lg text-surface-900 dark:text-surface-50">
          Get started with ITC Saathi
        </h2>
        <p className="text-sm text-surface-500 mt-1">
          Complete these steps to start claiming your GST Input Tax Credit.
        </p>
      </div>

      <div className="space-y-4">
        {steps.map((step) => (
          <div
            key={step.number}
            className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
              step.done
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50'
            }`}
          >
            {/* Step icon */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              step.done
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-saffron-100 dark:bg-saffron-900/30'
            }`}>
              {step.done
                ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                : <step.icon className="w-5 h-5 text-saffron-600 dark:text-saffron-400" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-surface-400">Step {step.number}</span>
                {step.done && (
                  <span className="badge-success text-[10px]">Done</span>
                )}
              </div>
              <p className="font-semibold text-surface-800 dark:text-surface-200 mt-0.5">
                {step.title}
              </p>
              <p className="text-sm text-surface-500 mt-0.5">{step.description}</p>
            </div>

            {!step.done && (
              <Link
                href={step.href}
                className="btn-primary py-1.5 px-3 text-xs flex-shrink-0"
              >
                {step.cta}
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-5">
        <div className="flex justify-between text-xs text-surface-400 mb-1.5">
          <span>Progress</span>
          <span>{steps.filter((s) => s.done).length}/{steps.length} complete</span>
        </div>
        <div className="h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-saffron-500 rounded-full transition-all duration-500"
            style={{ width: `${(steps.filter((s) => s.done).length / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
