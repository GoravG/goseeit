import { createColumnHelper, type RowData } from "@tanstack/react-table"
import type { DataTableFeatures } from "@/components/ui/data-table"

/** Typed column helper bound to the data table's feature set. */
export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>()
}
