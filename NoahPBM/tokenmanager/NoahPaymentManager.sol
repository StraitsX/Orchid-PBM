// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {INoahPaymentStateMachine} from "./INoahPaymentStateMachine.sol";
import {INoahPBMTreasury} from "./INoahPBMTreasury.sol";

abstract contract NoahPaymentManager is INoahPaymentStateMachine, INoahPBMTreasury {

}