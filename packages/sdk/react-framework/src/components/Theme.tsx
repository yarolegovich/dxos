//
// Copyright 2020 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';
import React, { ReactNode } from 'react';

import { colors, createTheme as createMuiTheme, CssBaseline, ThemeProvider } from '@mui/material';

// https://material-ui.com/customization/theming
export const defaultThemeProperties = {
  components: {
    MuiAppBar: {
      defaultProps: {
        elevation: 0
      }
    },

    MuiButtonBase: {
      defaultProps: {
        disableRipple: true
      }
    },

    MuiCssBaseline: {
      styleOverrides: {
        body: {
          overflow: 'hidden' // Prevent scroll bounce.
        }
      }
    }
  },

  palette: {
    primary: colors.blue,
    secondary: colors.blueGrey
  }
};

export const createTheme = (base: any) => createMuiTheme(defaultsDeep(base, defaultThemeProperties));

/**
 * @deprecated
 */
// TODO(burdon): Remove.
export const ReactUXTheme = ({ children, base }: { base: any; children: ReactNode }) => (
  <ThemeProvider theme={createTheme(base)}>
    <CssBaseline />
    {children}
  </ThemeProvider>
);
