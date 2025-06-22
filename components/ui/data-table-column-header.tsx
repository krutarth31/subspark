import { Column } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { Button } from './button'

interface Props<TData, TValue> {
  column: Column<TData, TValue>
  title: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
}: Props<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span>{title}</span>
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
    >
      <span>{title}</span>
      <ArrowUpDown className="ml-2 size-4" />
    </Button>
  )
}
