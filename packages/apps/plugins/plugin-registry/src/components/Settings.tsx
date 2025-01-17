//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { usePlugins } from '@dxos/app-framework';
import { useTranslation } from '@dxos/react-ui';

import { PluginList } from './PluginList';
import { REGISTRY_PLUGIN } from '../meta';

export const Settings = () => {
  const { t } = useTranslation(REGISTRY_PLUGIN);
  const { available, plugins, enabled, enablePlugin, disablePlugin } = usePlugins();
  const sortedPlugins = available.sort((a, b) => a.name?.localeCompare(b.name ?? '') ?? 0);

  return (
    <div role='none' className='space-b-2'>
      <h3 className='text-base font-system-medium'>{t('plugin registry label')}</h3>
      <div>
        <PluginList
          plugins={sortedPlugins}
          loaded={plugins.map(({ meta }) => meta.id)}
          enabled={enabled}
          onChange={(id, enabled) => (enabled ? enablePlugin(id) : disablePlugin(id))}
        />
      </div>
    </div>
  );
};
