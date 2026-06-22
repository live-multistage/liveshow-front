import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const chipVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-colors",
  {
    variants: {
      variant: {
        // Genre filter pill — interactive, Archivo 14px
        default:
          "rounded-full border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)] px-6 py-2 text-sm text-[#b9b9c0] font-archivo cursor-pointer hover:border-[rgba(255,46,158,.4)]",
        active:
          "rounded-full border border-[#ff2e9e] bg-[#ff2e9e] px-6 py-2 text-sm text-[#0a0a0b] font-archivo font-bold cursor-pointer",
        // Genre / tag chip — static label, Space Mono 12px
        tag: "rounded-[8px] border border-[rgba(255,255,255,.07)] bg-transparent px-2 py-0.5 text-[12px] leading-[18px] text-[#8f8f97] font-space-mono uppercase tracking-[0.05em]",
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
