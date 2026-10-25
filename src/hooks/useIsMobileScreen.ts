import { useMediaQuery, useTheme } from '@mui/material';

export function useIsMobileScreen(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('sm'));
}
