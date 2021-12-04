//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { Party } from '@dxos/client/src/proto/gen/dxos/client';

import { useClient } from '../client';

/**
 * Get all Parties available to current user.
 * Requires ClientConext to be set via ClientProvider.
 */
export const useRemoteParties = () => {
  const client = useClient();
  const [parties, setParties] = useState<Party[]>([]);

  useEffect(() => {
    const stream = client.services.PartyService.SubscribeParties();
    stream.subscribe(result => setParties(result.parties ?? []), console.error);

    return () => stream.close();
  }, []);

  return parties;
};
