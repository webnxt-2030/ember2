import { cn } from "@/lib/cn";

interface StepperProps {
  steps: string[];
  currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        const isPending = stepNumber > currentStep;

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center min-w-[4rem]">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-label-md font-medium transition-colors",
                  isCompleted && "bg-primary text-on-primary",
                  isActive && "bg-primary text-on-primary ring-2 ring-primary/30",
                  isPending && "bg-surface-container-high text-on-surface-variant"
                )}
              >
                {isCompleted ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              <span
                className={cn(
                  "mt-1.5 text-label-sm text-center",
                  isCompleted && "text-on-surface",
                  isActive && "text-on-surface font-medium",
                  isPending && "text-on-surface-variant"
                )}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 transition-colors",
                  isCompleted ? "bg-primary" : "bg-outline-variant"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
