//
// Copyright 2022 DXOS.org
//

import React, { Context, FC, ReactNode, createContext, useContext, useReducer } from 'react';

import { Config, Space } from '@dxos/client';
import { raise } from '@dxos/debug';
import { useConfig } from '@dxos/react-client';

export type AppState = {
  // Debug info.
  debug?: boolean;

  // Dev mode (auto identity, simple invitations).
  dev?: boolean;

  // PWA mode.
  pwa?: boolean;

  // Active frames.
  frames?: string[];

  // Active bots.
  bots?: string[];
};

type Action = {
  type: 'set-active-bot' | 'set-active-frame';
};

type SetBotAction = Action & {
  botId: string;
  active: boolean;
  space?: Space;
};

type SetFrameAction = Action & {
  frameId: string;
  active: boolean;
};

type ActionType = SetBotAction | SetFrameAction;

const reducer =
  (config: Config) =>
  (state: AppState, action: ActionType): AppState => {
    switch (action.type) {
      // TODO(burdon): Stop bot.
      case 'set-active-bot': {
        const { botId, active } = action as SetBotAction;
        const bots = (state.bots ?? []).filter((bot) => bot !== botId);
        if (active) {
          bots.push(botId);
          setTimeout(async () => {
            // TODO(burdon): Call bot client.
          });
        }

        return { ...state, bots };
      }

      case 'set-active-frame': {
        const { frameId, active } = action as SetFrameAction;
        const frames = (state.frames ?? []).filter((frame) => frame !== frameId);
        if (active) {
          frames.push(frameId);
        }

        return { ...state, frames };
      }

      default: {
        throw new Error(`Invalid action: ${JSON.stringify(action)}`);
      }
    }
  };

export type AppReducer = {
  state: AppState;
  setActiveBot: (id: string, active: boolean, space?: Space) => void;
  setActiveFrame: (id: string, active: boolean) => void;
};

export const AppStateContext: Context<AppReducer | undefined> = createContext<AppReducer | undefined>(undefined);

// TODO(burdon): Implement reducer.
// https://beta.reactjs.org/learn/scaling-up-with-reducer-and-context
export const AppStateProvider: FC<{ children: ReactNode; initialState?: AppState }> = ({ children, initialState }) => {
  const config = useConfig();
  const [state, dispatch] = useReducer(reducer(config), initialState ?? {});

  const value: AppReducer = {
    state,
    setActiveBot: (id: string, active: boolean, space?: Space) => {
      dispatch({ type: 'set-active-bot', botId: id, active, space });
    },
    setActiveFrame: (id: string, active: boolean) => {
      dispatch({ type: 'set-active-frame', frameId: id, active });
    }
  };

  // prettier-ignore
  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppState => {
  const { state } = useContext(AppStateContext) ?? raise(new Error('Missing AppStateContext.'));
  return state;
};

export const useAppReducer = (): AppReducer => {
  return useContext(AppStateContext) ?? raise(new Error('Missing AppStateContext.'));
};
