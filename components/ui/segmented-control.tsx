'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SegmentedControlOption {
  value: string
  label: string
}

interface SegmentedControlProps {
  options: SegmentedControlOption[]
  value: string
  onValueChange: (value: string) => void
  className?: string
}

export function SegmentedControl({
  options,
  value,
  onValueChange,
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
        className
      )}
    >
      {options.map((option) => (
        <Button
          key={option.value}
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 rounded-sm px-3',
            value === option.value
              ? 'bg-primary text-primary-foreground shadow-sm font-semibold hover:bg-primary hover:text-primary-foreground'
              : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
          )}
          onClick={() => onValueChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

