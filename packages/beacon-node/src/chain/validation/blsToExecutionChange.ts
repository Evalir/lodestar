import {capella} from "@lodestar/types";
import {
  isValidBlsToExecutionChange,
  getBlsToExecutionChangeSignatureSet,
  CachedBeaconStateCapella,
  computeStartSlotAtEpoch,
} from "@lodestar/state-transition";
import {ForkName} from "@lodestar/params";
import {IBeaconChain} from "..";
import {BlsToExecutionChangeError, BlsToExecutionChangeErrorCode, GossipAction} from "../errors/index.js";

export async function validateBlsToExecutionChange(
  chain: IBeaconChain,
  blsToExecutionChange: capella.SignedBLSToExecutionChange,
  signatureFork: ForkName
): Promise<void> {
  // [IGNORE] The blsToExecutionChange is the first valid blsToExecutionChange received for the validator with index
  // signedBLSToExecutionChange.message.validatorIndex.
  if (chain.opPool.hasSeenBlsToExecutionChange(blsToExecutionChange.message.validatorIndex)) {
    throw new BlsToExecutionChangeError(GossipAction.IGNORE, {
      code: BlsToExecutionChangeErrorCode.ALREADY_EXISTS,
    });
  }

  // validate bls to executionChange
  // NOTE: No need to advance head state since the signature's fork is handled with `broadcastedOnFork`,
  // and chanes relevant to `isValidBlsToExecutionChange()` happen only on processBlock(), not processEpoch()
  const state = chain.getHeadState();
  const {config} = state;

  // [REJECT] All of the conditions within process_bls_to_execution_change pass validation.
  // verifySignature = false, verified in batch below
  const {valid} = isValidBlsToExecutionChange(state as CachedBeaconStateCapella, blsToExecutionChange, false);
  if (!valid) {
    throw new BlsToExecutionChangeError(GossipAction.REJECT, {
      code: BlsToExecutionChangeErrorCode.INVALID,
    });
  }

  const signatureSlot = computeStartSlotAtEpoch(config.forks[signatureFork].epoch);

  const signatureSet = getBlsToExecutionChangeSignatureSet(config, signatureSlot, blsToExecutionChange);
  if (!(await chain.bls.verifySignatureSets([signatureSet], {batchable: true}))) {
    throw new BlsToExecutionChangeError(GossipAction.REJECT, {
      code: BlsToExecutionChangeErrorCode.INVALID_SIGNATURE,
    });
  }
}
