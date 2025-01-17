//
// Copyright 2022 DXOS.org
//

import React, { forwardRef, type FC, type ReactNode, Fragment, type ForwardedRef, type PropsWithChildren } from 'react';
import { createContext, useContext } from 'react';

import { ErrorBoundary } from './ErrorBoundary';
import { type SurfaceComponent, useSurface } from './SurfaceRootContext';

/**
 * Direction determines how multiple components are laid out.
 */
export type Direction = 'inline' | 'inline-reverse' | 'block' | 'block-reverse';

export type SurfaceProps = PropsWithChildren<{
  /**
   * Role defines how the data should be rendered.
   */
  role?: string;

  /**
   * Names allow nested surfaces to be specified in the parent context, similar to a slot.
   * Defaults to the value of `role` if not specified.
   */
  name?: string;

  /**
   * The data to be rendered by the surface.
   */
  data?: Record<string, unknown>;

  /**
   * Configure nested surfaces (indexed by the surface's `name`).
   */
  surfaces?: Record<string, Pick<SurfaceProps, 'data' | 'surfaces'>>;

  /**
   * If specified, the Surface will be wrapped in an error boundary.
   * The fallback component will be rendered if an error occurs.
   */
  fallback?: ErrorBoundary['props']['fallback'];

  /**
   * If specified, this will render if no plugin can offer renderable content for the surface.
   */
  contentFallback?: FC<{}>;

  /**
   * If more than one component is resolved, the limit determines how many are rendered.
   */
  limit?: number | undefined;

  /**
   * If more than one component is resolved, the direction determines how they are laid out.
   * NOTE: This is not yet implemented.
   */
  direction?: Direction;

  /**
   * Additional props to pass to the component.
   * These props are not used by Surface itself but may be used by components which resolve the surface.
   */
  [key: string]: unknown;
}>;

/**
 * A surface is a named region of the screen that can be populated by plugins.
 */
export const Surface = forwardRef<HTMLElement, SurfaceProps>(
  ({ role, name = role, fallback, ...rest }, forwardedRef) => {
    const props = { role, name, fallback, ...rest };
    const context = useContext(SurfaceContext);
    const data = props.data ?? ((name && context?.surfaces?.[name]?.data) || {});

    return (
      <>
        {fallback ? (
          <ErrorBoundary data={data} fallback={fallback}>
            <SurfaceResolver {...props} ref={forwardedRef} />
          </ErrorBoundary>
        ) : (
          <SurfaceResolver {...props} ref={forwardedRef} />
        )}
      </>
    );
  },
);

const SurfaceContext = createContext<SurfaceProps | null>(null);

const SurfaceResolver = forwardRef<HTMLElement, SurfaceProps>((props, forwardedRef) => {
  const { components } = useSurface();
  const parent = useContext(SurfaceContext);
  const nodes = resolveNodes(components, props, parent, forwardedRef);
  const currentContext: SurfaceProps = {
    ...props,
    surfaces: {
      ...((props.name && parent?.surfaces?.[props.name]?.surfaces) || {}),
      ...props.surfaces,
    },
  };

  return (
    <SurfaceContext.Provider value={currentContext}>
      {nodes.length > 0 ? nodes : props.contentFallback ? <props.contentFallback /> : null}
    </SurfaceContext.Provider>
  );
});

const resolveNodes = (
  components: Record<string, SurfaceComponent>,
  props: SurfaceProps,
  context: SurfaceProps | null,
  forwardedRef: ForwardedRef<HTMLElement>,
): ReactNode[] => {
  const data = {
    ...((props.name && context?.surfaces?.[props.name]?.data) || {}),
    ...props.data,
  };

  const nodes = Object.entries(components)
    .map(([key, component]) => {
      const result = component({ ...props, data }, forwardedRef);
      return result ? <Fragment key={key}>{result}</Fragment> : undefined;
    })
    .filter((Component): Component is JSX.Element => Boolean(Component));

  return props.limit ? nodes.slice(0, props.limit) : nodes;
};
