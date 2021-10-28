//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import jsondown from 'jsondown';
import leveljs from 'level-js';
import memdown from 'memdown';

import { synchronized } from '@dxos/async';
import { Config, defs } from '@dxos/config';
import { Invitation, SecretProvider } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { raise, TimeoutError, InvalidParameterError } from '@dxos/debug';
import * as debug from '@dxos/debug'; // TODO(burdon): ???
import { ECHO, InvitationOptions, OpenProgress, PartyNotFoundError, sortItemsTopologically } from '@dxos/echo-db';
import { DatabaseSnapshot } from '@dxos/echo-protocol';
import { ModelConstructor } from '@dxos/model-factory';
import { ValueUtil } from '@dxos/object-model';
import { createStorage } from '@dxos/random-access-multi-storage';

import { DevtoolsContext } from './devtools-context';
import { InvalidConfigurationError } from './errors';
import { isNode } from './platform';

export type StorageType = 'ram' | 'idb' | 'chrome' | 'firefox' | 'node';
export type KeyStorageType = 'ram' | 'leveljs' | 'jsondown';

export const defaultConfig: defs.Config = {};

export const defaultTestingConfig: defs.Config = {
  services: {
    signal: {
      server: 'ws://localhost:4000'
    }
  }
};

/**
 * Main DXOS client object.
 * An entrypoint to ECHO, HALO, DXNS.
 */
export class Client {
  private readonly _config: Config;

  private readonly _echo: ECHO;

  private readonly _wnsRegistry?: any; // TODO(burdon): Remove.

  private _initialized = false;

  /**
   * Creates the client object based on supplied configuration.
   * Requires initialization after creating by calling `.initialize()`.
   */
  constructor (config: defs.Config | Config = {}) {
    if (config instanceof Config) {
      this._config = config;
    } else {
      this._config = new Config(config);
    }

    const { feedStorage, keyStorage, snapshotStorage, metadataStorage } = createStorageObjects(
      this._config.get('system.storage', {})!,
      this._config.get('system.enableSnapshots', false)
    );

    this._echo = new ECHO({
      feedStorage,
      keyStorage,
      snapshotStorage,
      metadataStorage,
      networkManagerOptions: {
        signal: this._config.get('services.signal.server') ? [this._config.get('services.signal.server')!] : undefined,
        ice: this._config.get('services.ice'),
        log: true
      },
      snapshots: this._config.get('system.enableSnapshots', false),
      snapshotInterval: this._config.get('system.snapshotInterval')
    });

    // TODO(burdon): Remove.
    this._wnsRegistry = undefined;
  }

  toString () {
    return `Client(${JSON.stringify(this.info())})`;
  }

  info () {
    return {
      initialized: this.initialized,
      halo: this.halo.info(),
      echo: this.echo.info()
    };
  }

  get config (): Config {
    return this._config;
  }

  /**
   * Has the Client been initialized?
   * Initialize by calling `.initialize()`
   */
  get initialized () {
    return this._initialized;
  }

  /**
   * ECHO database.
   */
  get echo () {
    return this._echo;
  }

  /**
   * HALO credentials.
   */
  get halo () {
    // TODO(burdon): Why is this constructed inside ECHO?
    return this._echo.halo;
  }

  /**
   * WNS registry.
   * @deprecated
   */
  // TODO(burdon): Remove.
  get wnsRegistry () {
    return this._wnsRegistry;
  }

  /**
   * Initializes internal resources in an idempotent way.
   * Required before using the Client instance.
   */
  @synchronized
  async initialize (onProgressCallback?: (progress: OpenProgress) => void) {
    if (this._initialized) {
      return;
    }

    const t = 10;
    const timeout = setTimeout(() => {
      throw new TimeoutError(`Initialize timed out after ${t}s.`);
    }, t * 1000);

    await this._echo.open(onProgressCallback);

    this._initialized = true;
    clearInterval(timeout);
  }

  /**
   * Cleanup, release resources.
   */
  @synchronized
  async destroy () {
    if (!this._initialized) {
      return;
    }
    await this._echo.close();
    this._initialized = false;
  }

  /**
   * Resets and destroys client storage.
   * Warning: Inconsistent state after reset, do not continue to use this client instance.
   */
  // TODO(burdon): Should not require reloading the page (make re-entrant).
  //   Recreate echo instance? Big impact on hooks. Test.
  @synchronized
  async reset () {
    await this._echo.reset();
    this._initialized = false;
  }

  /**
   * This is a minimal solution for party restoration functionality.
   * It has limitations and hacks:
   * - We have to treat some models in a special way, this is not a generic solution
   * - We have to recreate relationship between old IDs in newly created IDs
   * - This won't work when identities are required, e.g. in chess.
   * This solution is appropriate only for short term, expected to work only in Teamwork
   */
  @synchronized
  async createPartyFromSnapshot (snapshot: DatabaseSnapshot) {
    const party = await this._echo.createParty();
    const items = snapshot.items ?? [];

    // We have a brand new item ids after creation, which breaks the old structure of id-parentId mapping.
    // That's why we have a mapping of old ids to new ids, to be able to recover the child-parent relations.
    const oldToNewIdMap = new Map<string, string>();

    for (const item of sortItemsTopologically(items)) {
      assert(item.itemId);
      assert(item.modelType);
      assert(item.model);

      const model = this.echo.modelFactory.getModel(item.modelType);
      if (!model) {
        console.warn('No model found in model factory (could need registering first): ', item.modelType);
        continue;
      }

      let parentId: string | undefined;
      if (item.parentId) {
        parentId = oldToNewIdMap.get(item.parentId);
        assert(parentId, 'Unable to recreate child-parent relationship - missing map record');
        const parentItem = await party.database.getItem(parentId);
        assert(parentItem, 'Unable to recreate child-parent relationship - parent not created');
      }

      const createdItem = await party.database.createItem({
        model: model.constructor,
        type: item.itemType,
        parent: parentId
      });

      oldToNewIdMap.set(item.itemId, createdItem.id);

      if (item.model.array) {
        for (const mutation of item.model.array.mutations || []) {
          const decodedMutation = model.meta.mutation.decode(mutation.mutation);
          await (createdItem.model as any).write(decodedMutation);
        }
      } else if (item.modelType === 'dxn://dxos.org/model/object') {
        assert(item?.model?.custom);
        assert(model.meta.snapshotCodec);
        assert(createdItem?.model);

        const decodedItemSnapshot = model.meta.snapshotCodec.decode(item.model.custom);
        const obj: any = {};
        assert(decodedItemSnapshot.root);
        ValueUtil.applyValue(obj, 'root', decodedItemSnapshot.root);

        // The planner board models have a structure in the object model, which needs to be recreated on new ids
        if (item.itemType === 'dxos.org/type/planner/card' && obj.root.listId) {
          obj.root.listId = oldToNewIdMap.get(obj.root.listId);
          assert(obj.root.listId, 'Failed to recreate child-parent structure of a planner card');
        }

        await createdItem.model.setProperties(obj.root);
      } else if (item.modelType === 'dxn://dxos.org/model/text') {
        assert(item?.model?.custom);
        assert(model.meta.snapshotCodec);
        assert(createdItem?.model);

        const decodedItemSnapshot = model.meta.snapshotCodec.decode(item.model.custom);

        await createdItem.model.restoreFromSnapshot(decodedItemSnapshot);
      } else {
        throw new InvalidParameterError(`Unhandled model type: ${item.modelType}`);
      }
    }

    return party;
  }

  /**
   * Creates an invitation to a given party.
   * The Invitation flow requires the inviter and invitee to be online at the same time.
   * If the invitee is known ahead of time, `createOfflineInvitation` can be used instead.
   * The invitation flow is protected by a generated pin code.
   *
   * To be used with `client.echo.joinParty` on the invitee side.
   *
   * @param partyKey the Party to create the invitation for.
   * @param secretProvider supplies the pin code
   * @param options.onFinish A function to be called when the invitation is closed (successfully or not).
   * @param options.expiration Date.now()-style timestamp of when this invitation should expire.
   */
  async createInvitation (partyKey: PublicKey, secretProvider: SecretProvider, options?: InvitationOptions) {
    const party = await this.echo.getParty(partyKey) ?? raise(new PartyNotFoundError(partyKey));
    return party.createInvitation({
      // TODO(marik-d): Probably an error here.
      secretValidator:
        async (invitation: Invitation, secret: Buffer) => secret && secret.equals((invitation as any).secret),
      secretProvider
    },
    options);
  }

  /**
   * Hook to create an Offline Invitation for a recipient to a given party.
   * Offline Invitation, unlike regular invitation, does NOT require
   * the inviter and invitee to be online at the same time - hence `Offline` Invitation.
   * The invitee (recipient) needs to be known ahead of time.
   * Invitation it not valid for other users.
   *
   * To be used with `client.echo.joinParty` on the invitee side.
   *
   * @param partyKey the Party to create the invitation for.
   * @param recipientKey the invitee (recipient for the invitation).
   */
  // TODO(burdon): Move to party.
  async createOfflineInvitation (partyKey: PublicKey, recipientKey: PublicKey) {
    const party = await this.echo.getParty(partyKey) ?? raise(new PartyNotFoundError(partyKey));
    return party.createOfflineInvitation(recipientKey);
  }

  //
  // ECHO
  //

  /**
   * Registers a new ECHO model.
   */
  // TODO(burdon): Expose echo directly?
  registerModel (constructor: ModelConstructor<any>): this {
    this._echo.modelFactory.registerModel(constructor);
    return this;
  }

  //
  // Deprecated
  // TODO(burdon): Separate wrapper for devtools?
  //

  /**
   * Returns devtools context.
   * Used by the DXOS DevTool Extension.
   */
  getDevtoolsContext (): DevtoolsContext {
    const devtoolsContext: DevtoolsContext = {
      client: this,
      feedStore: this._echo.feedStore,
      networkManager: this._echo.networkManager,
      modelFactory: this._echo.modelFactory,
      keyring: this._echo.halo.keyring,
      debug
    };

    return devtoolsContext;
  }
}

// TODO(burdon): Factor out.
const createStorageObjects = (config: defs.System.Storage, snapshotsEnabled = false) => {
  const {
    path = 'dxos/storage', // TODO(burdon): Factor out const.
    storageType,
    keyStorage,
    persistent = false
  } = config ?? {};

  if (persistent && storageType === defs.System.Storage.StorageDriver.RAM) {
    throw new InvalidConfigurationError('RAM storage cannot be used in persistent mode.');
  }
  if (!persistent && (storageType !== undefined && storageType !== defs.System.Storage.StorageDriver.RAM)) {
    throw new InvalidConfigurationError('Cannot use a persistent storage in not persistent mode.');
  }
  if (persistent && keyStorage === defs.System.Storage.StorageDriver.RAM) {
    throw new InvalidConfigurationError('RAM key storage cannot be used in persistent mode.');
  }
  if (!persistent && (keyStorage !== defs.System.Storage.StorageDriver.RAM && keyStorage !== undefined)) {
    throw new InvalidConfigurationError('Cannot use a persistent key storage in not persistent mode.');
  }

  return {
    feedStorage: createStorage(`${path}/feeds`, persistent ? toStorageType(storageType) : 'ram'),
    keyStorage: createKeyStorage(`${path}/keystore`, persistent ? toKeyStorageType(keyStorage) : 'ram'),
    snapshotStorage: createStorage(`${path}/snapshots`, persistent && snapshotsEnabled ? toStorageType(storageType) : 'ram'),
    metadataStorage: createStorage(`${path}/metadata`, persistent ? toStorageType(storageType) : 'ram')
  };
};

// TODO(burdon): Factor out.
const createKeyStorage = (path: string, type?: KeyStorageType) => {
  const defaultedType = type ?? (isNode() ? 'jsondown' : 'leveljs');

  switch (defaultedType) {
    case 'leveljs':
      return leveljs(path);
    case 'jsondown':
      return jsondown(path);
    case 'ram':
      return memdown();
    default:
      throw new InvalidConfigurationError(`Invalid key storage type: ${defaultedType}`);
  }
};

const toStorageType = (type: defs.System.Storage.StorageDriver | undefined): StorageType | undefined => {
  switch (type) {
    case undefined: return undefined;
    case defs.System.Storage.StorageDriver.RAM: return 'ram';
    case defs.System.Storage.StorageDriver.CHROME: return 'chrome';
    case defs.System.Storage.StorageDriver.FIREFOX: return 'firefox';
    case defs.System.Storage.StorageDriver.IDB: return 'idb';
    case defs.System.Storage.StorageDriver.NODE: return 'node';
    default: throw new Error(`Invalid storage type: ${defs.System.Storage.StorageDriver[type]}`);
  }
};

const toKeyStorageType = (type: defs.System.Storage.StorageDriver | undefined): KeyStorageType | undefined => {
  switch (type) {
    case undefined: return undefined;
    case defs.System.Storage.StorageDriver.RAM: return 'ram';
    case defs.System.Storage.StorageDriver.LEVELJS: return 'leveljs';
    case defs.System.Storage.StorageDriver.JSONDOWN: return 'jsondown';
    default: throw new Error(`Invalid key storage type: ${defs.System.Storage.StorageDriver[type]}`);
  }
};
