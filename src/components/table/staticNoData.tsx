import { TableRow, TableCell, Box, Typography } from '@mui/material';

interface StaticNoDataProps {
  heading?: string;
  subHeading?: string;
}

export default function StaticNoData({ heading = 'No Data', subHeading = '' }: StaticNoDataProps) {
  return (
    <TableRow>
      <TableCell colSpan={100} align="center" sx={{ border: 'none', py: 6 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {heading || 'No Data'}
          </Typography>
          {subHeading && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {subHeading}
            </Typography>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
}
