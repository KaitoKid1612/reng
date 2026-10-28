import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

import type { ButtonHTMLAttributes } from "react";

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
interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant }), className)} {...props} />;
}
