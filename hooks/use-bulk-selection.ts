import * as React from "react"

export type BulkSelection = {
  selectedIds: Set<string>
  count: number
  allSelected: boolean
  someSelected: boolean
  isEmpty: boolean
  toggle: (id: string) => void
  toggleAll: () => void
  clear: () => void
  remove: (ids: string[]) => void
  has: (id: string) => boolean
}

export type BulkSelectionResult = readonly [
  BulkSelection,
  (el: HTMLInputElement | null) => void,
]

export function useBulkSelection(visibleIds: string[]): BulkSelectionResult {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    () => new Set(),
  )
  const headerCheckboxRef = React.useRef<HTMLInputElement | null>(null)
  const allSelectedRef = React.useRef(false)
  const someSelectedRef = React.useRef(false)

  const visibleIdSet = React.useMemo(
    () => new Set(visibleIds),
    [visibleIds],
  )

  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))
  const someSelected = visibleIds.some((id) => selectedIds.has(id))

  React.useEffect(() => {
    allSelectedRef.current = allSelected
    someSelectedRef.current = someSelected
    const el = headerCheckboxRef.current
    if (el) el.indeterminate = !allSelected && someSelected
  }, [allSelected, someSelected])

  const bindHeaderCheckbox = React.useCallback(
    (el: HTMLInputElement | null) => {
      headerCheckboxRef.current = el
      if (el) {
        el.indeterminate =
          !allSelectedRef.current && someSelectedRef.current
      }
    },
    [],
  )

  const toggle = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = React.useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        for (const id of visibleIdSet) next.delete(id)
      } else {
        for (const id of visibleIdSet) next.add(id)
      }
      return next
    })
  }, [allSelected, visibleIdSet])

  const clear = React.useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const remove = React.useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      let changed = false
      const next = new Set(prev)
      for (const id of ids) {
        if (next.delete(id)) changed = true
      }
      return changed ? next : prev
    })
  }, [])

  const has = React.useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  )

  const selection: BulkSelection = {
    selectedIds,
    count: selectedIds.size,
    allSelected,
    someSelected,
    isEmpty: visibleIds.length === 0,
    toggle,
    toggleAll,
    clear,
    remove,
    has,
  }

  return [selection, bindHeaderCheckbox] as const
}
