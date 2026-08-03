import React from 'react';
import {
  TableContainer, Table, TableHead, TableRow, TableCell, TableBody,
  Paper, TablePagination, Box, Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import EmptyState from '../common/EmptyState';

const DENSITY_PADDING = {
  comfortable: { py: 2, px: 2.5, fontSize: '0.8125rem' },
  compact: { py: 1.25, px: 2, fontSize: '0.75rem' },
  dense: { py: 0.75, px: 1.5, fontSize: '0.75rem' },
};

const DataTable = ({
  columns = [],
  rows = [],
  loading = false,
  page = 0,
  rowsPerPage = 10,
  totalCount,
  onPageChange,
  onRowsPerPageChange,
  density = 'comfortable',
  emptyTitle = 'No records found',
  emptySubtitle = 'Try adjusting your search query or filter parameters.',
  emptyIcon,
  stickyHeader = true,
  maxHeight = 600,
  onRowClick,
}) => {
  const theme = useTheme();
  const cellStyle = DENSITY_PADDING[density] || DENSITY_PADDING.comfortable;

  const displayedRows = typeof totalCount === 'number'
    ? rows
    : rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const count = typeof totalCount === 'number' ? totalCount : rows.length;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '16px',
        border: '1px solid rgba(28, 25, 23, 0.06)',
        overflow: 'hidden',
        background: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)'
      }}
    >
      {rows.length === 0 && !loading ? (
        <EmptyState
          title={emptyTitle}
          subtitle={emptySubtitle}
          icon={emptyIcon}
        />
      ) : (
        <>
          <TableContainer sx={{ maxHeight }}>
            <Table stickyHeader={stickyHeader}>
              <TableHead>
                <TableRow>
                  {columns.map((col) => (
                    <TableCell
                      key={col.field || col.headerName}
                      align={col.align || 'left'}
                      style={{ width: col.width }}
                      sx={{
                        ...cellStyle,
                        fontWeight: 600,
                        color: 'text.secondary',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        bgcolor: '#FFFFFF',
                        borderBottom: '1px solid rgba(28, 25, 23, 0.08)',
                      }}
                    >
                      {col.headerName}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedRows.map((row, index) => (
                  <TableRow
                    key={row.id || index}
                    hover
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    sx={{
                      cursor: onRowClick ? 'pointer' : 'default',
                      transition: 'background-color 0.15s ease-out',
                      '&:hover': {
                        bgcolor: 'rgba(221, 161, 94, 0.04)',
                      },
                    }}
                  >
                    {columns.map((col) => (
                      <TableCell
                        key={col.field || col.headerName}
                        align={col.align || 'left'}
                        sx={{
                          ...cellStyle,
                          borderBottom: '1px solid rgba(28, 25, 23, 0.06)',
                          color: 'text.primary',
                        }}
                      >
                        {col.renderCell ? col.renderCell(row) : row[col.field]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {onPageChange && (
            <TablePagination
              component="div"
              count={count}
              page={page}
              onPageChange={onPageChange}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={onRowsPerPageChange}
              rowsPerPageOptions={[10, 25, 50, 100]}
              sx={{
                borderTop: '1px solid rgba(28, 25, 23, 0.06)',
                color: 'text.secondary',
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  fontSize: '0.75rem',
                  fontWeight: 500,
                },
              }}
            />
          )}
        </>
      )}
    </Paper>
  );
};

export default DataTable;
