//
// Copyright 2022 DXOS.org
//

import { Event } from '@dxos/async';
import { Item } from '@dxos/echo-db';
import { GraphData, GraphModel } from '@dxos/gem-spore';

/**
 * ECHO adapter for the Graph model.
 */
export class EchoGraphModel implements GraphModel<Item<any>> {
  readonly updated = new Event<GraphData<Item<any>>>();

  private readonly _graph: GraphData<Item<any>> = {
    nodes: [],
    links: []
  }

  get graph () {
    return this._graph;
  }

  subscribe (callback: (graph: GraphData<Item<any>>) => void) {
    return this.updated.on(callback);
  }

  refresh () {
    this.updated.emit(this._graph);
  }

  update (items: Item<any>[]) {
    this._graph.nodes = items;
    this._graph.links = [];

    items.forEach(item => {
      const { parent } = item;
      if (parent) {
        this._graph.links.push({
          id: `${parent.id}-${item.id}`,
          source: parent.id,
          target: item.id
        });
      }
    });

    this.updated.emit(this._graph);
  }
}