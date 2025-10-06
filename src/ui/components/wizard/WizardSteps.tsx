import { Check } from 'lucide-react';
import { cn } from '@/ui/lib/utils';

interface WizardStepsProps {
  currentStep: number;
}

const steps = [
  { id: 0, name: 'MCP Connection' },
  { id: 1, name: 'Discover Capabilities' },
  { id: 2, name: 'Map to VS Code' },
  { id: 3, name: 'Extension Info' },
  { id: 4, name: 'Preview & Build' },
];

export function WizardSteps({ currentStep }: WizardStepsProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center">
        {steps.map((step, stepIdx) => (
          <li
            key={step.name}
            className={cn(
              stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : '',
              'relative flex-1'
            )}
          >
            {currentStep > step.id ? (
              <>
                <div
                  className="absolute inset-0 flex items-center"
                  aria-hidden="true"
                >
                  <div className="h-0.5 w-full bg-primary" />
                </div>
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary hover:bg-primary/80">
                  <Check className="h-5 w-5 text-primary-foreground" />
                  <span className="sr-only">{step.name}</span>
                </div>
              </>
            ) : currentStep === step.id ? (
              <>
                <div
                  className="absolute inset-0 flex items-center"
                  aria-hidden="true"
                >
                  <div className="h-0.5 w-full bg-muted" />
                </div>
                <div
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background"
                  aria-current="step"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="sr-only">{step.name}</span>
                </div>
              </>
            ) : (
              <>
                <div
                  className="absolute inset-0 flex items-center"
                  aria-hidden="true"
                >
                  <div className="h-0.5 w-full bg-muted" />
                </div>
                <div className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted bg-background hover:border-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-muted-foreground" />
                  <span className="sr-only">{step.name}</span>
                </div>
              </>
            )}
            <span className="absolute -bottom-6 left-0 text-sm font-medium">
              {step.name}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
