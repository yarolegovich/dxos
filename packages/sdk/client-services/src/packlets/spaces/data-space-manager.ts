//
// Copyright 2022 DXOS.org
//

import { Event, synchronized, trackLeaks } from '@dxos/async';
import { Context } from '@dxos/context';
import {
  AcceptSpaceOptions,
  DataServiceSubscriptions,
  MetadataStore,
  SigningContext,
  SnapshotStore,
  Space,
  spaceGenesis,
  SpaceManager,
  SnapshotManager
} from '@dxos/echo-db';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { Presence } from '@dxos/teleport-extension-presence';
import { ComplexMap } from '@dxos/util';

import { DataSpace } from './data-space';

@trackLeaks('open', 'close')
export class DataSpaceManager {
  private readonly _ctx = new Context();

  public readonly updated = new Event();

  private readonly _spaces = new ComplexMap<PublicKey, DataSpace>(PublicKey.hash);

  constructor(
    private readonly _spaceManager: SpaceManager,
    private readonly _metadataStore: MetadataStore,
    private readonly _dataServiceSubscriptions: DataServiceSubscriptions,
    private readonly _keyring: Keyring,
    private readonly _signingContext: SigningContext,
    private readonly _modelFactory: ModelFactory,
    private readonly _snapshotStore: SnapshotStore
  ) {}

  // TODO(burdon): Remove.
  get spaces() {
    return this._spaces;
  }

  @synchronized
  async open() {
    await this._metadataStore.load();
    log('metadata loaded', { spaces: this._metadataStore.spaces.length });

    for (const spaceMetadata of this._metadataStore.spaces) {
      log('load space', { spaceMetadata });
      const space = await this._constructSpace(spaceMetadata);
      if (spaceMetadata.latestTimeframe) {
        log('waiting for latest timeframe', { spaceMetadata });
        await space.dataPipelineController.waitUntilTimeframe(spaceMetadata.latestTimeframe);
      }
    }
  }

  @synchronized
  async close() {
    await this._ctx.dispose();
    for (const space of this._spaces.values()) {
      await space.close();
    }
  }

  /**
   * Creates a new space writing the genesis credentials to the control feed.
   */
  @synchronized
  async createSpace() {
    const spaceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();
    const metadata: SpaceMetadata = {
      key: spaceKey,
      genesisFeedKey: controlFeedKey,
      controlFeedKey,
      dataFeedKey
    };

    log('creating space...', { spaceKey });
    const space = await this._constructSpace(metadata);

    await spaceGenesis(this._keyring, this._signingContext, space.inner);
    await this._metadataStore.addSpace(metadata);

    this.updated.emit();
    return space;
  }

  // TODO(burdon): Rename join space.
  @synchronized
  async acceptSpace(opts: AcceptSpaceOptions): Promise<DataSpace> {
    const metadata: SpaceMetadata = {
      key: opts.spaceKey,
      genesisFeedKey: opts.genesisFeedKey,
      controlFeedKey: opts.controlFeedKey,
      dataFeedKey: opts.dataFeedKey
    };

    const space = await this._constructSpace(metadata);
    await this._metadataStore.addSpace(metadata);
    this.updated.emit();
    return space;
  }

  private async _constructSpace(metadata: SpaceMetadata) {
    const presence = new Presence({
      localPeerId: this._signingContext.deviceKey,
      announceInterval: 1_000,
      offlineTimeout: 30_000,
      identityKey: this._signingContext.identityKey
    });
    const snapshotManager = new SnapshotManager(this._snapshotStore);

    const space: Space = await this._spaceManager.constructSpace({
      metadata,
      swarmIdentity: {
        peerKey: this._signingContext.deviceKey,
        credentialProvider: this._signingContext.credentialProvider,
        credentialAuthenticator: this._signingContext.credentialAuthenticator
      },
      onNetworkConnection: (session) => {
        session.addExtension(
          'dxos.mesh.teleport.presence',
          presence.createExtension({ remotePeerId: session.remotePeerId })
        );
        session.addExtension('dxos.mesh.teleport.objectsync', snapshotManager.objectSync.createExtension());
      }
    });

    const dataSpace = new DataSpace({
      inner: space,
      modelFactory: this._modelFactory,
      metadataStore: this._metadataStore,
      snapshotManager,
      presence,
      memberKey: this._signingContext.identityKey,
      snapshotId: metadata.snapshot
    });

    await dataSpace.open();
    this._dataServiceSubscriptions.registerSpace(space.key, dataSpace.database.createDataServiceHost());
    this._spaces.set(metadata.key, dataSpace);
    return dataSpace;
  }
}