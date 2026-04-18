import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Step } from '../types';

interface StepsListProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (stepId: number) => void;
}

export function StepsList({ steps, currentStep, onStepClick }: StepsListProps) {
  return (
    <div className="h-full">
      <p className="text-xs font-semibold uppercase tracking-widest mb-4"
        style={{ color: 'var(--text-muted)' }}>
        Build Steps
      </p>
      <div className="space-y-1">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className="flex items-start gap-2.5 px-2 py-2 rounded-lg cursor-pointer transition-all duration-150"
            style={{
              background: currentStep === step.id ? 'var(--bg-elevated)' : 'transparent',
              border: currentStep === step.id
                ? '1px solid var(--border-active)'
                : '1px solid transparent',
            }}
            onClick={() => onStepClick(step.id)}
            onMouseEnter={(e) => {
              if (currentStep !== step.id)
                (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)';
            }}
            onMouseLeave={(e) => {
              if (currentStep !== step.id)
                (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            <div className="mt-0.5 flex-shrink-0">
              {step.status === 'completed' ? (
                <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              ) : step.status === 'in-progress' ? (
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--accent)' }} />
              ) : (
                <Circle className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium leading-snug truncate"
                style={{ color: currentStep === step.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {step.title}
              </p>
              {step.description && (
                <p className="text-xs mt-0.5 leading-snug line-clamp-2"
                  style={{ color: 'var(--text-muted)' }}>
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}