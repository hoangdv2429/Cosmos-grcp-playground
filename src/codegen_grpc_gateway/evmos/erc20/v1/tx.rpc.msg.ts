import * as fm from "../../../grpc-gateway";
import { MsgConvertCoin, MsgConvertCoinResponse, MsgConvertERC20, MsgConvertERC20Response } from "./tx";
export class Msg {
  /**
   * ConvertCoin mints a ERC20 representation of the native Cosmos coin denom
   * that is registered on the token mapping.
   */
  static convertCoin(request: MsgConvertCoin, initRequest?: fm.InitReq): Promise<MsgConvertCoinResponse> {
    return fm.fetchReq(`/evmos.erc20.v1/convertCoin`, {
      ...initRequest,
      method: "POST",
      body: JSON.stringify(request, fm.replacer)
    });
  }
  /**
   * ConvertERC20 mints a native Cosmos coin representation of the ERC20 token
   * contract that is registered on the token mapping.
   */
  static convertERC20(request: MsgConvertERC20, initRequest?: fm.InitReq): Promise<MsgConvertERC20Response> {
    return fm.fetchReq(`/evmos.erc20.v1/convertERC20`, {
      ...initRequest,
      method: "POST",
      body: JSON.stringify(request, fm.replacer)
    });
  }
}