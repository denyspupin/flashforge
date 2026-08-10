"use client";

import * as React from "react";
import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio";

/**
 * Constrains its content to a fixed width-to-height `ratio` (e.g. 16 / 9) —
 * for responsive media that mustn't jump as it loads.
 *
 * Documentation: https://garn.ohuba.com/components/aspect-ratio
 */
function AspectRatio({
  ...props
}: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };
