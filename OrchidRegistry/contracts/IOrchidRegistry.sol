/**
* Copyright (c) 2023 StraitsX Pte. Ltd.
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is furnished to
* do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
* WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
* CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

pragma solidity 0.8.18;

interface IOrchidRegistry {

    // Events
    event MerchantRegistered(string hashOfQRMerchantInfo, address indexed merchantAddress);
    event MerchantDeregistered(string hashOfQRMerchantInfo, address indexed merchantAddress);
    event MerchantReplaced(string hashOfQRMerchantInfo, address indexed oldMerchantAddress, address indexed newMerchantAddress);

    // Functions

    // @dev Registers a merchant address by adding it to _loopup mapping. Only the owner can call this.
    // @param _hashOfQRDestInfo The Keccak256 hash of the QR_merchant_info
    // @param _merchantAddress The address of the merchant to be registered
    function registerMerchantQR(string calldata _hashOfQRMerchantInfo, address _merchantAddress) external;

    // @dev Deregisters a merchant address by removing it from the _lookup mapping. Only the owner can call this.
    // @param _hashOfQRDestInfo The Keccak256 hash of the QR_merchant_info
    function deregisterMerchantQR(string calldata _hashOfQRMerchantInfo) external;

    // @dev Replaces an existing merchant address with a new merchant address
    // @param _hashOfQRDestInfo The Keccak256 hash of the QR_merchant_info
    // @param _merchantAddress The new address of the merchant to be registered
    function replaceMerchantQR(string calldata _hashOfQRMerchantInfo, address _merchantAddress) external;

    // @dev Gets the merchant address when provided with a hash of the QR_merchant_info. Alternatively, an offline database can be build using the events emitted to enable gas-free search.
    // @param _hashOfQRDestInfo The Keccak256 hash of the QR_merchant_info
    // @return The address of the merchant. If the merchant address is not found, reverts that merchant is not registered.
    function getMerchantAddress(string calldata _hashOfQRMerchantInfo) external view returns (address);

}