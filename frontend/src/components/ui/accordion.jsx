import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item ref={ref} className={cn("border-b", className)} {...props} />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}>
      {children}
      <ChevronDown
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName

// forceMount keeps every answer in the document whether or not its panel is
// open. Radix unmounts closed content by default, which meant the FAQ answers
// on the homepage and the membership page existed only after a click: not in
// the initial HTML, not in the prerender, not readable by anything that does
// not click. The JSON-LD in the shell was encoding answers the page itself did
// not contain.
//
// Hiding it is now this component's job. Radix writes hidden={!open} only on
// the path where it unmounts the panel itself; under forceMount the panel is
// always present and always considered visible, so without the class below a
// closed answer rendered about 39px of text into the page. Measured, not
// assumed: the first version of this change shipped that bug.
//
// data-[state=closed]:hidden is display:none, which is what a collapsed panel
// should be. Out of view, out of the accessibility tree, matching the trigger's
// own aria-expanded="false", and still in the document for anything reading the
// HTML rather than clicking it. Hidden, not absent.
//
// The cost is the collapse animation, which cannot run on an element that is
// display:none. Content a crawler can read is worth more than 200ms of easing.
const AccordionContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    forceMount
    className="overflow-hidden text-sm data-[state=closed]:hidden data-[state=open]:animate-accordion-down"
    {...props}>
    <div className={cn("pb-4 pt-0", className)}>{children}</div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = AccordionPrimitive.Content.displayName

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
