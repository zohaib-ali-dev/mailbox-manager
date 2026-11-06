'use client';

import TablePagination from '@mui/material/TablePagination';
import { PAGE_SIZE_OPTIONS } from '@/shared/constants';
import type { PageMeta } from '@/shared/types/order.dto';

/** Server-driven pagination: page and page size live in the URL (see useUrlQuery). */
export function ListPagination({
  meta,
  onChange,
}: {
  meta: PageMeta;
  onChange: (changes: { page?: number; pageSize?: number }) => void;
}) {
  return (
    <TablePagination
      component="div"
      count={meta.total}
      page={Math.min(meta.page, meta.totalPages) - 1}
      rowsPerPage={meta.pageSize}
      rowsPerPageOptions={[...PAGE_SIZE_OPTIONS]}
      onPageChange={(_event, page) => onChange({ page: page + 1 })}
      onRowsPerPageChange={(event) => onChange({ pageSize: Number(event.target.value), page: 1 })}
      labelRowsPerPage="Rows"
      sx={{
        borderTop: 1,
        borderColor: 'divider',
        '& .MuiTablePagination-toolbar': { flexWrap: 'wrap' },
      }}
    />
  );
}
