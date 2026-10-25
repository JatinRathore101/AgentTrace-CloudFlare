'use client';

import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Skeleton,
  Typography,
  useTheme,
} from '@mui/material';
import { useIsMobileScreen } from '@/hooks/useIsMobileScreen';
import StaticNoData from './staticNoData';

export interface Column<T = Record<string, unknown>> {
  accessor: string;
  Header: string;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  Cell?: React.ComponentType<{ value: unknown; row: T }>;
}

interface DataTableBodyProps<T = Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  page: number;
  totalRecords: number;
  handlePageChange?: (value: number) => void;
  handleRowsPerPageChange?: (value: number) => void;
  loading?: boolean;
  rowsPerPage?: number;
  showPagination?: boolean;
  noDataHeading?: string;
  noDataSubHeading?: string;
}

export default function DataTableBody<T = Record<string, unknown>>({
  columns,
  data,
  page,
  totalRecords,
  handlePageChange = () => {},
  handleRowsPerPageChange = () => {},
  loading = false,
  rowsPerPage = 10,
  showPagination = true,
  noDataHeading = '',
  noDataSubHeading = '',
}: DataTableBodyProps<T>) {
  const theme = useTheme();
  const isMobile = useIsMobileScreen();
  const noData = !Boolean(data?.length > 0);

  return (
    <Box
      sx={{
        width: '100%',
        boxShadow: '0 0 0 0.5px rgba(145, 158, 171, 0.40)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <TableContainer
        sx={{
          borderRadius: '8px 8px 0px 0px',
          minHeight: '270px',
        }}
      >
        <Table sx={{ minWidth: 750 }} size={'medium'}>
          <TableHead
            sx={{
              background: theme.palette.background.paper,
              '& .MuiTableCell-root': {
                borderBottom: `1px solid ${theme.palette.secondary.dark}`,
              },
            }}
          >
            <TableRow>
              {columns.map((headCell) => (
                <TableCell
                  key={headCell.accessor}
                  align={headCell.align || 'left'}
                  padding={'normal'}
                  sx={{
                    whiteSpace: 'pre',
                    fontWeight: 700,
                    color: theme.palette.text.secondary,
                    fontSize: isMobile ? '14px' : '16px',
                    width: headCell.width || 'auto',
                    fontFamily: 'Lato',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: headCell.align || 'left',
                    }}
                  >
                    {headCell.Header}
                  </Box>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody sx={{ position: 'relative' }}>
            {noData && !loading ? (
              <StaticNoData heading={noDataHeading} subHeading={noDataSubHeading} />
            ) : loading ? (
              [...Array(rowsPerPage || 10)].map((_, index) => (
                <TableRow tabIndex={-1} key={index} sx={{ height: 53 }}>
                  {columns.map((headCell) => (
                    <TableCell
                      key={headCell.accessor}
                      align={headCell.align || 'left'}
                      padding={'normal'}
                      sx={{
                        borderBottom: `1px solid ${theme.palette.secondary.dark + '80'}`,
                        fontWeight: 400,
                        color: theme.palette.text.primary,
                        fontSize: isMobile ? '11px' : '13px',
                        width: headCell.width || 'auto',
                        background: theme.palette.background.default,
                      }}
                    >
                      <Skeleton />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              data?.map((row, index) => (
                <TableRow tabIndex={-1} key={index} sx={{ height: 53 }}>
                  {columns.map((headCell) => (
                    <TableCell
                      key={headCell.accessor}
                      align={headCell.align || 'left'}
                      padding={'normal'}
                      sx={{
                        borderBottom: `1px solid ${theme.palette.secondary.dark + '80'}`,
                        fontWeight: 400,
                        color: theme.palette.text.primary,
                        fontSize: isMobile ? '11px' : '13px',
                        width: headCell.width || 'auto',
                        background: theme.palette.background.default,
                        fontFamily: 'Lato',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: headCell.align || 'left',
                        }}
                      >
                        {headCell.Cell ? (
                          <headCell.Cell
                            value={(row as Record<string, unknown>)[headCell.accessor]}
                            row={row}
                          />
                        ) : (
                          <Typography
                            sx={{ fontSize: 'inherit', fontWeight: 'inherit', fontFamily: 'Lato' }}
                            noWrap
                          >
                            {String((row as Record<string, unknown>)[headCell.accessor] ?? '')}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {showPagination && (
        <TablePagination
          sx={{
            background:
              theme.palette.mode === 'light'
                ? `${theme.palette.text.primary}10`
                : theme.palette.background.paper,
            fontSize: { xs: '9px', md: '12px' },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-select': {
              fontSize: { xs: '9px', md: '12px' },
            },
            '& .MuiTablePagination-displayedRows': {
              fontSize: { xs: '9px', md: '12px' },
            },
            '& .MuiSvgIcon-root': {
              fontSize: { xs: '16px', md: '20px' },
            },
          }}
          rowsPerPageOptions={[5, 10, 25, 50, 100]}
          component="div"
          page={page}
          onPageChange={(_, n) => handlePageChange(n || 0)}
          onRowsPerPageChange={(e) => handleRowsPerPageChange(Number(e?.target?.value) || 10)}
          rowsPerPage={rowsPerPage}
          count={totalRecords}
        />
      )}
    </Box>
  );
}
