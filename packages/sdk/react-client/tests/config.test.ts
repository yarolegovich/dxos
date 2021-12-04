//
// Copyright 2020 DXOS.org
//

import { renderHook } from '@testing-library/react-hooks';
import expect from 'expect';

import { useConfig } from '../src';

describe('Config hook', () => {
  const render = () => useConfig();

  it('should throw when used outside a context', () => {
    const { result } = renderHook(render);
    // TODO(burdon): Do NOT test functionality by matching literal error messages.
    expect(result.error?.message)
      .toEqual('`useConfig` hook is called outside of ClientContext. Use `ClientProvider`');
  });

  // TODO(burdon): Add test for context.
});
