//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/aurora';
import { defaultDescription, mx } from '@dxos/aurora-theme';

export const EmptyTree = () => {
  const { t } = useTranslation('composer');
  return (
    <div
      role='none'
      className={mx(
        'p-2 mli-2 mbe-2 text-center border border-dashed border-neutral-400/50 rounded-xl',
        defaultDescription,
      )}
    >
      {t('empty tree message')}
    </div>
  );
};