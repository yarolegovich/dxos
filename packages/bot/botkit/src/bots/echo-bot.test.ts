//
// Copyright 2021 DXOS.org
//

import expect from 'expect';

import { PublicKey } from '@dxos/crypto';

import { setupClient } from '../testutils';
import { EchoBot, TEST_ECHO_TYPE } from './echo-bot';

describe('Echo Bot', () => {
  it('Starts a bot', async () => {
    const { client, party, invitation } = await setupClient();
    const bot = new EchoBot(TEST_ECHO_TYPE);

    await bot.Initialize({
      invitation
    });

    const command = PublicKey.random().asUint8Array();
    await bot.Command({ command: command });

    const item = await party.database.waitForItem({ type: TEST_ECHO_TYPE });
    const payload = item.model.getProperty('payload');
    expect(PublicKey.from(payload).toString()).toBe(PublicKey.from(command).toString());

    await bot.Stop();
    await client.destroy();
  });
});
