//
// Copyright 2022 DXOS.org
//

export type InitOptions = {
  apiKey?: string;
  batchSize?: number;
  enable?: boolean;
};

type CommonOptions = {
  installationId: string;
  identityId: string;
  name: string;
  properties?: object;
  timestamp?: Date;
};

export type PageOptions = CommonOptions & {
  category?: string;
};

export type EventOptions = CommonOptions;
