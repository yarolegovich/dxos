//
// Copyright 2023 DXOS.org
//

import { Square } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { Space } from '@dxos/client';
import { observer } from '@dxos/react-client';
import { Button, getSize, mx } from '@dxos/react-components';

import { icons, themes } from '../../hooks';

export const SpaceSettings: FC<{ space: Space }> = observer(({ space }) => {
  return (
    <div>
      <SpaceThemes
        selected={space.properties.theme}
        onSelect={(theme) => {
          space.properties.theme = theme;
        }}
      />
      <SpaceIcons
        selected={space.properties.icon}
        onSelect={(icon) => {
          space.properties.icon = icon;
        }}
      />
    </div>
  );
});

export const SpaceThemes: FC<{ selected: string; onSelect: (selected: string) => void }> = ({ selected, onSelect }) => {
  return (
    <div className='flex'>
      <div className='grid grid-cols-6'>
        {themes.map(({ id, classes }) => (
          <Button key={id} variant='ghost' className='p-0' onClick={() => onSelect(id)}>
            <div className={mx('m-2', selected === id && 'ring-2 ring-black')}>
              <Square className={mx(getSize(6), classes.header, 'text-transparent')} />
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

export const SpaceIcons: FC<{ selected: string; onSelect: (selected: string) => void }> = ({ selected, onSelect }) => {
  return (
    <div className='flex'>
      <div className='grid grid-cols-6'>
        {icons.map(({ id, Icon }) => (
          <Button key={id} variant='ghost' className='p-0' onClick={() => onSelect(id)}>
            <div className={mx('m-1 p-1', selected === id && 'ring-2 ring-black')}>
              <Icon className={getSize(6)} />
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};