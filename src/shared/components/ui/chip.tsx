import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const chipVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-colors",
  {
    variants: {
      variant: {
        // Genre filter pill — Space Mono 11px uppercase (DESIGN.md §5)
        default:
          "rounded-full border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)] px-[13px] py-[7px] text-[11px] leading-none font-[500] text-[#b9b9c0] font-space-mono uppercase tracking-[.05em] cursor-pointer whitespace-nowrap hover:border-[rgba(255,46,158,.4)] hover:text-white transition-colors",
        active:
          "rounded-full border border-[#ff2e9e] bg-[#ff2e9e] px-[13px] py-[7px] text-[11px] leading-none font-[700] text-[#0a0a0b] font-space-mono uppercase tracking-[.05em] cursor-pointer whitespace-nowrap",
        // Footer static tag — Space Mono 10px uppercase
        tag: "rounded-[6px] border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.05)] px-[9px] py-[5px] text-[10px] leading-none font-[700] text-[#b9b9c0] font-space-mono uppercase tracking-[.08em]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Chip({
  className,
  variant,
  asChild = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof chipVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="chip"
      className={cn(chipVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Chip, chipVariants };
