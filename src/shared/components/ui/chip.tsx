import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "./utils";

const chipVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap shrink-0 transition-colors",
  {
    variants: {
      variant: {
        // Genre filter pill — interactive, Jost 14px
        default:
          "rounded-full border border-[#374151] bg-[#1A1A1A] px-6 py-2 text-sm text-white font-jost cursor-pointer hover:border-[#DC2626]",
        active:
          "rounded-full border border-transparent bg-[#DC2626] px-6 py-2 text-sm text-white font-jost cursor-pointer",
        // Genre / tag chip — static label, JetBrains Mono 12px
        tag: "rounded-[8px] border border-[#27272A] bg-transparent px-2 py-0.5 text-[12px] leading-[18px] text-[#A1A1AA] font-jetbrains uppercase tracking-[0.05em]",
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
