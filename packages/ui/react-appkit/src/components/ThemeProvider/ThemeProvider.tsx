//
// Copyright 2022 DXOS.org
//

import {
  Provider as ToastProvider,
  ToastProviderProps,
  Viewport as ToastViewport,
  ToastViewportProps
} from '@radix-ui/react-toast';
import React, { PropsWithChildren } from 'react';

import {
  ThemeProvider as AuroraThemeProvider,
  ThemeProviderProps as AuroraThemeProviderProps,
  TooltipProvider,
  TooltipProviderProps
} from '@dxos/aurora';
import { mx, osTx, appTx } from '@dxos/aurora-theme';

export type ThemeProviderProps = AuroraThemeProviderProps &
  PropsWithChildren<{
    themeVariant?: 'app' | 'os';
    tooltipProviderProps?: Omit<TooltipProviderProps, 'children'>;
    toastProviderProps?: Omit<ToastProviderProps, 'children'>;
    toastViewportProps?: Omit<ToastViewportProps, 'children'>;
  }>;

export const ThemeProvider = ({
  children,
  themeVariant,
  tooltipProviderProps,
  toastProviderProps,
  toastViewportProps,
  ...auroraThemeProviderProps
}: ThemeProviderProps) => {
  return (
    <AuroraThemeProvider tx={themeVariant === 'os' ? osTx : appTx} {...auroraThemeProviderProps}>
      <ToastProvider {...toastProviderProps}>
        <TooltipProvider delayDuration={100} skipDelayDuration={400} {...tooltipProviderProps}>
          {children}
        </TooltipProvider>
        <ToastViewport
          {...toastViewportProps}
          className={mx(
            'z-[70] fixed bottom-4 inset-x-4 w-auto md:top-4 md:right-4 md:left-auto md:bottom-auto md:w-full md:max-w-sm rounded-lg flex flex-col gap-2',
            toastViewportProps?.className
          )}
        />
      </ToastProvider>
    </AuroraThemeProvider>
  );
};
