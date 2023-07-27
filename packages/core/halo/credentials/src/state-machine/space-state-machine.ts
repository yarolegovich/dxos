//
// Copyright 2022 DXOS.org
//

import { runInContextAsync } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TypedMessage } from '@dxos/protocols';
import { Credential, SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { AsyncCallback, Callback, ComplexSet } from '@dxos/util';

import { getCredentialAssertion, verifyCredential } from '../credentials';
import { CredentialProcessor } from '../processor/credential-processor';
import { FeedInfo, FeedStateMachine } from './feed-state-machine';
import { MemberStateMachine, MemberInfo } from './member-state-machine';

export interface SpaceState {
  readonly members: ReadonlyMap<PublicKey, MemberInfo>;
  readonly feeds: ReadonlyMap<PublicKey, FeedInfo>;
  readonly credentials: Credential[];
  readonly genesisCredential: Credential | undefined;
  readonly creator: MemberInfo | undefined;

  addCredentialProcessor(processor: CredentialProcessor): Promise<void>;
  removeCredentialProcessor(processor: CredentialProcessor): Promise<void>;

  getCredentialsOfType(type: TypedMessage['@type']): Credential[];
}

/**
 * Validates and processes credentials for a single space.
 * Keeps a list of members and feeds.
 * Keeps and in-memory index of credentials and allows to query them.
 */
export class SpaceStateMachine implements SpaceState {
  private readonly _members = new MemberStateMachine(this._spaceKey);
  private readonly _feeds = new FeedStateMachine(this._spaceKey);
  private readonly _credentials: Credential[] = [];
  private readonly _processedCredentials = new ComplexSet<PublicKey>(PublicKey.hash);

  private _genesisCredential: Credential | undefined;
  private _credentialProcessors: CredentialConsumer<any>[] = [];

  readonly onCredentialProcessed = new Callback<AsyncCallback<Credential>>();
  readonly onMemberAdmitted = this._members.onMemberAdmitted;
  readonly onFeedAdmitted = this._feeds.onFeedAdmitted;

  // prettier-ignore
  constructor(
    private readonly _spaceKey: PublicKey
  ) { }

  get creator(): MemberInfo | undefined {
    return this._members.creator;
  }

  get members(): ReadonlyMap<PublicKey, MemberInfo> {
    return this._members.members;
  }

  get feeds(): ReadonlyMap<PublicKey, FeedInfo> {
    return this._feeds.feeds;
  }

  get credentials(): Credential[] {
    return this._credentials;
  }

  get genesisCredential(): Credential | undefined {
    return this._genesisCredential;
  }

  async addCredentialProcessor(processor: CredentialProcessor) {
    if (this._credentialProcessors.find((p) => p.processor === processor)) {
      throw new Error('Credential processor already added.');
    }

    const consumer = new CredentialConsumer(
      processor,
      async () => {
        for (const credential of this._credentials) {
          await consumer._process(credential);
        }

        // NOTE: It is important to set this flag after immediately after processing existing credentials.
        // Otherwise, we might miss some credentials.
        // Having an `await` statement between the end of the loop and setting the flag would cause a race condition.
        consumer._isReadyForLiveCredentials = true;
      },
      async () => {
        this._credentialProcessors = this._credentialProcessors.filter((p) => p !== consumer);
      },
    );
    this._credentialProcessors.push(consumer);

    await consumer.open();
  }

  async removeCredentialProcessor(processor: CredentialProcessor) {
    const consumer = this._credentialProcessors.find((p) => p.processor === processor);
    await consumer?.close();
  }

  getCredentialsOfType(type: TypedMessage['@type']): Credential[] {
    return this._credentials.filter((credential) => getCredentialAssertion(credential)['@type'] === type);
  }

  /**
   * @param credential Message to process.
   * @param fromFeed Key of the feed where this credential is recorded.
   */
  async process(credential: Credential, fromFeed: PublicKey): Promise<boolean> {
    if (credential.id) {
      if (this._processedCredentials.has(credential.id)) {
        return true;
      }
      this._processedCredentials.add(credential.id);
    }

    const result = await verifyCredential(credential);
    if (result.kind !== 'pass') {
      log.warn(`Invalid credential: ${result.errors.join(', ')}`);
      return false;
    }

    const assertion = getCredentialAssertion(credential);
    switch (assertion['@type']) {
      case 'dxos.halo.credentials.SpaceGenesis': {
        if (this._genesisCredential) {
          log.warn('Space already has a genesis credential.');
          return false;
        }
        if (!credential.issuer.equals(this._spaceKey)) {
          log.warn('Space genesis credential must be issued by space.');
          return false;
        }
        if (!credential.subject.id.equals(this._spaceKey)) {
          log.warn('Space genesis credential must be issued to space.');
          return false;
        }

        this._genesisCredential = credential;
        break;
      }

      case 'dxos.halo.credentials.SpaceMember': {
        if (!assertion.spaceKey.equals(this._spaceKey)) {
          break; // Ignore credentials for other spaces.
        }

        if (!this._genesisCredential) {
          log.warn('Space must have a genesis credential before adding members.');
          return false;
        }
        if (!this._canInviteNewMembers(credential.issuer)) {
          log.warn(`Space member is not authorized to invite new members: ${credential.issuer}`);
          return false;
        }

        await this._members.process(credential);
        break;
      }

      case 'dxos.halo.credentials.AdmittedFeed': {
        if (!this._genesisCredential) {
          log.warn('Space must have a genesis credential before admitting feeds.');
          return false;
        }
        if (!this._canAdmitFeeds(credential.issuer)) {
          log.warn(`Space member is not authorized to admit feeds: ${credential.issuer}`);
          return false;
        }

        // TODO(dmaretskyi): Check that the feed owner is a member of the space.
        await this._feeds.process(credential, fromFeed);
        break;
      }
    }

    // TODO(burdon): Await or void?
    void this._credentials.push(credential);

    for (const processor of this._credentialProcessors) {
      if (processor._isReadyForLiveCredentials) {
        await processor._process(credential);
      }
    }

    await this.onCredentialProcessed.callIfSet(credential);
    return true;
  }

  private _canInviteNewMembers(key: PublicKey): boolean {
    return key.equals(this._spaceKey) || this._members.getRole(key) === SpaceMember.Role.ADMIN;
  }

  private _canAdmitFeeds(key: PublicKey): boolean {
    const role = this._members.getRole(key);
    return role === SpaceMember.Role.MEMBER || role === SpaceMember.Role.ADMIN;
  }
}

// TODO(dmaretskyi): Simplify.
class CredentialConsumer<T extends CredentialProcessor> {
  private _ctx = new Context();

  /**
   * @internal
   * Processor is ready to process live credentials.
   * NOTE: Setting this flag before all existing credentials are processed will cause them to be processed out of order.
   * Set externally.
   */
  _isReadyForLiveCredentials = false;

  constructor(
    public readonly processor: T,
    private readonly _onOpen: () => Promise<void>,
    private readonly _onClose: () => Promise<void>,
  ) {}

  /**
   * @internal
   */
  async _process(credential: Credential) {
    await runInContextAsync(this._ctx, async () => {
      await this.processor.processCredential(credential);
    });
  }

  async open() {
    if (this._ctx.disposed) {
      throw new Error('CredentialProcessor is disposed');
    }

    await this._onOpen();
  }

  async close() {
    await this._ctx.dispose();

    await this._onClose();
  }
}
