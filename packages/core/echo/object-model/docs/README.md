# @dxos/object-model

ECHO object model.

## Dependency Graph

```mermaid
%%{ init: {'flowchart':{'curve':'basis'}} }%%

flowchart LR

%% Classes
classDef def fill:#fff,stroke:#333,stroke-width:1px
classDef root fill:#fff,stroke:#333,stroke-width:4px

%% Nodes

subgraph echo [echo]
  style echo fill:#b3cae6,stroke:#fff
  dxos/object-model("@dxos/object-model"):::root
  click dxos/object-model "dxos/dxos/tree/main/packages/core/echo/object-model/docs"
  dxos/model-factory("@dxos/model-factory"):::def
  click dxos/model-factory "dxos/dxos/tree/main/packages/core/echo/model-factory/docs"
end

subgraph common [common]
  style common fill:#debac2,stroke:#fff
  dxos/codec-protobuf("@dxos/codec-protobuf"):::def
  click dxos/codec-protobuf "dxos/dxos/tree/main/packages/common/codec-protobuf/docs"
  dxos/feed-store("@dxos/feed-store"):::def
  click dxos/feed-store "dxos/dxos/tree/main/packages/common/feed-store/docs"
  dxos/random-access-storage("@dxos/random-access-storage"):::def
  click dxos/random-access-storage "dxos/dxos/tree/main/packages/common/random-access-storage/docs"

  subgraph common-excluded [ ]
    style common-excluded fill:#debac2,stroke:#333,stroke-dasharray:5 5
    dxos/async("@dxos/async"):::def
    click dxos/async "dxos/dxos/tree/main/packages/common/async/docs"
    dxos/debug("@dxos/debug"):::def
    click dxos/debug "dxos/dxos/tree/main/packages/common/debug/docs"
    dxos/log("@dxos/log"):::def
    click dxos/log "dxos/dxos/tree/main/packages/common/log/docs"
    dxos/keys("@dxos/keys"):::def
    click dxos/keys "dxos/dxos/tree/main/packages/common/keys/docs"
    dxos/util("@dxos/util"):::def
    click dxos/util "dxos/dxos/tree/main/packages/common/util/docs"
  end
end

subgraph halo [halo]
  style halo fill:#cabade,stroke:#fff
  dxos/keyring("@dxos/keyring"):::def
  click dxos/keyring "dxos/dxos/tree/main/packages/core/halo/keyring/docs"
end

subgraph core [core]
  style core fill:#edabb3,stroke:#fff
  dxos/protocols("@dxos/protocols"):::def
  click dxos/protocols "dxos/dxos/tree/main/packages/core/protocols/docs"
end

%% Links
linkStyle default stroke:#333,stroke-width:1px
dxos/object-model --> dxos/model-factory
dxos/model-factory --> dxos/feed-store
dxos/feed-store --> dxos/keyring
dxos/keyring --> dxos/protocols
dxos/protocols --> dxos/codec-protobuf
dxos/keyring --> dxos/random-access-storage
```

## Dependencies

| Module | Direct |
|---|---|
| [`@dxos/async`](../../../../common/async/docs/README.md) | &check; |
| [`@dxos/codec-protobuf`](../../../../common/codec-protobuf/docs/README.md) | &check; |
| [`@dxos/debug`](../../../../common/debug/docs/README.md) |  |
| [`@dxos/feed-store`](../../../../common/feed-store/docs/README.md) |  |
| [`@dxos/keyring`](../../../halo/keyring/docs/README.md) |  |
| [`@dxos/keys`](../../../../common/keys/docs/README.md) |  |
| [`@dxos/log`](../../../../common/log/docs/README.md) |  |
| [`@dxos/model-factory`](../../model-factory/docs/README.md) | &check; |
| [`@dxos/protocols`](../../../protocols/docs/README.md) | &check; |
| [`@dxos/random-access-storage`](../../../../common/random-access-storage/docs/README.md) |  |
| [`@dxos/util`](../../../../common/util/docs/README.md) | &check; |