import {MAX_REQUEST_LIGHT_CLIENT_UPDATES} from "@lodestar/params";
import {altair, ssz} from "@lodestar/types";
import {Encoding, ProtocolDefinitionGenerator} from "../types.js";
import {getContextBytesLightclient} from "./utils.js";

// eslint-disable-next-line @typescript-eslint/naming-convention
export const LightClientUpdatesByRange: ProtocolDefinitionGenerator<
  altair.LightClientUpdatesByRange,
  altair.LightClientUpdate
> = (modules, handler) => {
  return {
    method: "light_client_updates_by_range",
    version: 1,
    encoding: Encoding.SSZ_SNAPPY,
    handler,
    requestType: () => ssz.altair.LightClientUpdatesByRange,
    responseType: () => ssz.altair.LightClientUpdate,
    renderRequestBody: (req) => `${req.startPeriod},${req.count}`,
    contextBytes: getContextBytesLightclient((update) => modules.config.getForkName(update.signatureSlot), modules),
    inboundRateLimits: {
      // Same rationale as for BeaconBlocksByRange
      byPeer: {quota: MAX_REQUEST_LIGHT_CLIENT_UPDATES, quotaTimeMs: 10_000},
      getRequestCount: (req) => req.count,
    },
  };
};
