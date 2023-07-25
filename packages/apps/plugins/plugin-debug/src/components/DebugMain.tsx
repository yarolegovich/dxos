//
// Copyright 2023 DXOS.org
//

import { Play, HandPalm } from '@phosphor-icons/react';
import React, { FC, useContext, useEffect, useMemo, useState } from 'react';

import { Debug as DebugType } from '@braneframe/types';
import { Button, DensityProvider, Input, Main, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { diagnostics } from '@dxos/client/diagnostics';
import { SpaceProxy } from '@dxos/client/echo';
import { useClient, useConfig } from '@dxos/react-client';
import { arrayToBuffer } from '@dxos/util';

import { DEBUG_PANEL, DebugContext } from '../props';
import { Generator } from '../testing';

export const DEFAULT_PERIOD = 500;

export const DebugMain: FC<{ data: [SpaceProxy, DebugType] }> = ({ data: [space, _] }) => {
  const { t } = useTranslation(DEBUG_PANEL);

  const client = useClient();
  const [data, setData] = useState<any>({});
  const handleRefresh = async () => {
    const data = await diagnostics(client, { humanize: true, truncate: true });
    setData(data);
  };
  useEffect(() => {
    void handleRefresh();
  }, []);

  const [mutationInterval, setMutationInterval] = useState(String(DEFAULT_PERIOD));

  const generator = useMemo(() => {
    const generator = new Generator(space);
    void generator.initialize();
    return generator;
  }, [space]);

  const { running, start, stop } = useContext(DebugContext);
  const handleToggleRunning = () => {
    if (running) {
      stop();
      void handleRefresh();
    } else {
      start(() => generator.updateObject(), parseInt(mutationInterval));
    }
  };

  const handleCreateObject = async () => {
    generator.createObject();
  };

  const handleUpdateObject = async () => {
    generator.updateObject();
  };

  const handleCreateEpoch = async () => {
    await space.internal.createEpoch();
    await handleRefresh();
  };

  const config = useConfig();
  const handleOpenDevtools = () => {
    const vaultUrl = config.values?.runtime?.client?.remoteSource;
    if (vaultUrl) {
      window.open(`https://devtools.dev.dxos.org/?target=vault:${vaultUrl}`);
    }
  };

  return (
    <Main.Content classNames='flex flex-col grow min-bs-[100vh]'>
      <div className='flex shrink-0 p-2 space-x-2'>
        <DensityProvider density='fine'>
          <Button onClick={handleCreateObject}>Create</Button>
          <Button onClick={handleUpdateObject}>Update</Button>
          <div className='w-[80px]'>
            <Input.Root>
              <Input.TextInput
                title={t('mutation period')}
                autoComplete='off'
                classNames='flex-1 is-auto pis-2 text-right'
                placeholder='Mutation period'
                value={mutationInterval}
                onChange={({ target: { value } }) => setMutationInterval(value)}
              />
            </Input.Root>
          </div>
          <Button onClick={handleToggleRunning}>
            {running ? <HandPalm className={getSize(5)} /> : <Play className={getSize(5)} />}
          </Button>

          <div className='grow' />
          <Button onClick={handleOpenDevtools}>Open Devtools</Button>
          <Button onClick={handleRefresh}>Refresh</Button>
          <Button onClick={handleCreateEpoch}>Create epoch</Button>
        </DensityProvider>
      </div>

      {/* TODO(burdon): Highlight. */}
      <div className='flex grow overflow-auto p-2 text-sm font-thin'>
        <pre>
          <code>{JSON.stringify(data, replacer, 2)}</code>
        </pre>
      </div>
    </Main.Content>
  );
};

// TODO(burdon): Refactor from devtools.
const replacer = (key: any, value: any) => {
  if (typeof value === 'object') {
    if (value instanceof Uint8Array) {
      return arrayToBuffer(value).toString('hex');
    }

    if (value?.type === 'Buffer') {
      return Buffer.from(value.data).toString('hex');
    }

    if (key === 'downloaded') {
      return undefined;
    }
  }

  return value;
};