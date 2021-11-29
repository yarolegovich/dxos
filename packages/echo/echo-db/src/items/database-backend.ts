//
// Copyright 2021 DXOS.org
//

import assert from 'assert';

import { DatabaseSnapshot, DataService, EchoEnvelope, FeedWriter, PartyKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';

import { ItemDemuxer, ItemDemuxerOptions, ItemManager } from '..';
import { DataMirror } from './data-mirror';
import { DataServiceHost } from './data-service-host';

/**
 * Generic interface to represent a backend for the database.
 *
 * Interfaces with ItemManager to maintain the collection of entities up-to-date.
 * Porvides a way to query for the write stream to make mutations.
 * Creates data snapshots.
 */
export interface DatabaseBackend {
  open(itemManager: ItemManager, modelFactory: ModelFactory): Promise<void>
  close(): Promise<void>

  isReadOnly: boolean

  getWriteStream(): FeedWriter<EchoEnvelope> | undefined

  createSnapshot(): DatabaseSnapshot

  createDataServiceHost(): DataServiceHost
}

/**
 * Database backend that operates on two streams: read and write.
 *
 * Mutations are read from the incoming streams and applied to the ItemManager via ItemDemuxer.
 * Write operations result in mutations being written to the outgoing stream.
 */
export class FeedDatabaseBackend implements DatabaseBackend {
  private _itemDemuxerInboundStream!: NodeJS.WritableStream
  private _itemManager!: ItemManager;
  private _itemDemuxer!: ItemDemuxer;

  constructor (
    private readonly _inboundStream: NodeJS.ReadableStream,
    private readonly _outboundStream: FeedWriter<EchoEnvelope> | undefined,
    private readonly _snapshot?: DatabaseSnapshot,
    private readonly _options: ItemDemuxerOptions = {}
  ) {}

  async open (itemManager: ItemManager, modelFactory: ModelFactory) {
    this._itemManager = itemManager;
    this._itemDemuxer = new ItemDemuxer(itemManager, modelFactory, this._options);
    this._itemDemuxerInboundStream = this._itemDemuxer.open();
    this._inboundStream.pipe(this._itemDemuxerInboundStream);

    if (this._snapshot) {
      await this._itemDemuxer.restoreFromSnapshot(this._snapshot);
    }
  }

  async close () {
    this._inboundStream?.unpipe(this._itemDemuxerInboundStream);
  }

  get isReadOnly (): boolean {
    return !!this._outboundStream;
  }

  getWriteStream (): FeedWriter<EchoEnvelope> | undefined {
    return this._outboundStream;
  }

  createSnapshot () {
    return this._itemDemuxer.createSnapshot();
  }

  createDataServiceHost () {
    return new DataServiceHost(
      this._itemManager,
      this._itemDemuxer,
      this._outboundStream ?? undefined
    );
  }
}

/**
 * Database backend that is backed by the DataService instance.
 *
 * Uses DataMirror to populate entities in ItemManager.
 */
export class RemoteDatabaseBacked implements DatabaseBackend {
  private _itemManager!: ItemManager;

  constructor (
    private readonly _service: DataService,
    private readonly _partyKey: PartyKey
  ) {}

  async open (itemManager: ItemManager, modelFactory: ModelFactory): Promise<void> {
    this._itemManager = itemManager;

    const dataMirror = new DataMirror(this._itemManager, this._service, this._partyKey);

    dataMirror.open();
  }

  async close (): Promise<void> {
    // Do nothing for now.
  }

  get isReadOnly (): boolean {
    return false;
  }

  getWriteStream (): FeedWriter<EchoEnvelope> | undefined {
    return {
      write: async (mutation) => {
        const { feedKey, seq } = await this._service.Write({ mutation, partyKey: this._partyKey });
        assert(feedKey);
        assert(seq !== undefined);
        return {
          feedKey,
          seq
        };
      }
    };
  }

  createSnapshot (): DatabaseSnapshot {
    throw new Error('Method not supported.');
  }

  createDataServiceHost (): DataServiceHost {
    throw new Error('Method not supported.');
  }
}
