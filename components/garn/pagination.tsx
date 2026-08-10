import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { type ButtonProps, buttonVariants } from "@/components/garn/button";

/**
 * Page navigation for a paged list or table — renders a labelled `<nav>` of page links.
 *
 * Documentation: https://garn.ohuba.com/components/pagination
 */
const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    data-slot="pagination"
    {...props}
  />
);
Pagination.displayName = "Pagination";

/** The row that holds the page items. */
function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "flex flex-row items-center gap-[var(--garn-gap-inline)]",
        className
      )}
      data-slot="pagination-content"
      {...props}
    />
  );
}

/** A single slot in the row — a page link, ellipsis, or prev/next control. */
function PaginationItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      className={cn("", className)}
      data-slot="pagination-item"
      {...props}
    />
  );
}

type PaginationLinkProps = {
  /** Marks the current page — `aria-current="page"` + a `data-active` reflect. */
  active?: boolean;
  /**
   * Button size rung the link borrows for its box.
   * @default "icon"
   */
  size?: ButtonProps["size"];
} & React.ComponentProps<"a">;

/** A single page number, styled as a button; pass `active` for the current page. */
const PaginationLink = ({
  className,
  active,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={active ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: active ? "outline" : "ghost",
        size,
      }),
      className
    )}
    data-slot="pagination-link"
    data-active={active || undefined}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

/** The "go to previous page" control. */
const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="md"
    className={cn("gap-1 pl-2.5", className)}
    data-slot="pagination-previous"
    {...props}
  >
    <ChevronLeft className="size-4" />
    <span>Previous</span>
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

/** The "go to next page" control. */
const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="md"
    className={cn("gap-1 pr-2.5", className)}
    data-slot="pagination-next"
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="size-4" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

/** Stands in for a skipped run of page numbers; decorative. */
const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn(
      "flex size-[var(--garn-control-h-md)] items-center justify-center",
      className
    )}
    data-slot="pagination-ellipsis"
    {...props}
  >
    <MoreHorizontal className="size-4" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
