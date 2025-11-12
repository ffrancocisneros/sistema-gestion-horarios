import { useState, useCallback } from 'react'

type SortOrder = 'asc' | 'desc'

interface UseSortableTableReturn<T extends string> {
  sortBy: T | null
  sortOrder: SortOrder
  handleSort: (field: T) => void
  getSortIcon: (field: T) => '↑' | '↓' | ''
}

export function useSortableTable<T extends string>(
  defaultSortBy: T | null = null,
  defaultSortOrder: SortOrder = 'desc'
): UseSortableTableReturn<T> {
  const [sortBy, setSortBy] = useState<T | null>(defaultSortBy)
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder)

  const handleSort = useCallback(
    (field: T) => {
      if (sortBy === field) {
        // Si ya está ordenado por este campo, cambiar dirección
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      } else {
        // Si es un campo nuevo, ordenar ascendente por defecto
        setSortBy(field)
        setSortOrder('asc')
      }
    },
    [sortBy]
  )

  const getSortIcon = useCallback(
    (field: T): '↑' | '↓' | '' => {
      if (sortBy !== field) return ''
      return sortOrder === 'asc' ? '↑' : '↓'
    },
    [sortBy, sortOrder]
  )

  return {
    sortBy: sortBy ?? defaultSortBy,
    sortOrder,
    handleSort,
    getSortIcon,
  }
}

