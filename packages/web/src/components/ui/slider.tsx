import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  showValue?: boolean;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, showValue = false, ...props }, ref) => {
    return (
      <div className="flex items-center gap-3">
        <input
          type="range"
          className={cn(
            "h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary",
            "[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary",
            "[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className
          )}
          ref={ref}
          {...props}
        />
        {showValue && (
          <span className="min-w-[3ch] text-sm text-muted-foreground">
            {props.value}
          </span>
        )}
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
