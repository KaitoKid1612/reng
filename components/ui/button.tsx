import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

import type { ComponentPropsWithRef } from "react";

export const buttonVariants = cva("button", {
  variants: {
    variant: {
      default: "button-primary",
      outline: "button-outline",
      ghost: "button-ghost",
    },
  },
  defaultVariants: { variant: "default" },
});
// React 19 passes ref as a prop, so a caller can move focus to a button.
interface ButtonProps
  extends ComponentPropsWithRef<"button">, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant }), className)} {...props} />;
}
