//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useIdentity, useSpaces } from '@dxos/react-client';

export const Counter = () => {
  // Get the user to log in before a space can be obtained.
  useIdentity();
  // Get the first available space, created with the identity.
  const [space] = useSpaces();
  return <></>;
};
