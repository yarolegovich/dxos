//
// Copyright 2023 DXOS.org
//

import {
  Provider as TooltipProviderPrimitive,
  TooltipProviderProps as TooltipProviderPrimitiveProps,
  Root as TooltipRootPrimitive,
  TooltipProps as TooltipRootPrimitiveProps,
  TooltipContentProps as TooltipContentPrimitiveProps,
  TooltipContent as TooltipContentPrimitive,
  TooltipTriggerProps as TooltipTriggerPrimitiveProps,
  TooltipTrigger as TooltipTriggerPrimitive,
  TooltipPortalProps as TooltipPortalPrimitiveProps,
  TooltipPortal as TooltipPortalPrimitive,
  TooltipArrowProps as TooltipArrowPrimitiveProps,
  TooltipArrow as TooltipArrowPrimitive
} from '@radix-ui/react-tooltip';
import React, { forwardRef, FunctionComponent } from 'react';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';

type TooltipProviderProps = TooltipProviderPrimitiveProps;

const TooltipProvider: FunctionComponent<TooltipProviderProps> = TooltipProviderPrimitive;

type TooltipRootProps = TooltipRootPrimitiveProps;

const TooltipRoot: FunctionComponent<TooltipRootProps> = TooltipRootPrimitive;

type TooltipPortalProps = TooltipPortalPrimitiveProps;

const TooltipPortal = TooltipPortalPrimitive;

type TooltipTriggerProps = TooltipTriggerPrimitiveProps;

const TooltipTrigger = TooltipTriggerPrimitive;

type TooltipArrowProps = ThemedClassName<TooltipArrowPrimitiveProps>;

const TooltipArrow = forwardRef<SVGSVGElement, TooltipArrowProps>(({ className, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <TooltipArrowPrimitive
      {...props}
      className={tx('tooltip.arrow', 'tooltip__arrow', {}, className)}
      ref={forwardedRef}
    />
  );
});

type TooltipContentProps = ThemedClassName<TooltipContentPrimitiveProps>;

const TooltipContent = forwardRef<HTMLDivElement, TooltipContentProps>(({ className, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <TooltipContentPrimitive
      {...props}
      className={tx('tooltip.content', 'tooltip', {}, className)}
      ref={forwardedRef}
    />
  );
});

export { TooltipProvider, TooltipRoot, TooltipPortal, TooltipTrigger, TooltipArrow, TooltipContent };

export type {
  TooltipProviderProps,
  TooltipRootProps,
  TooltipPortalProps,
  TooltipTriggerProps,
  TooltipArrowProps,
  TooltipContentProps
};
