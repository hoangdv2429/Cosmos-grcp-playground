import * as fm from "../../../grpc-gateway";
import { QueryEpochsInfoRequest, QueryEpochsInfoResponse, QueryCurrentEpochRequest, QueryCurrentEpochResponse } from "./query";
export class Query {
  /** EpochInfos provide running epochInfos */
  static epochInfos(request: QueryEpochsInfoRequest, initRequest?: fm.InitReq): Promise<QueryEpochsInfoResponse> {
    return fm.fetchReq(`/evmos/epochs/v1/epochs?${fm.renderURLSearchParams({
      ...request
    }, [])}`, {
      ...initRequest,
      method: "GET"
    });
  }
  /** CurrentEpoch provide current epoch of specified identifier */
  static currentEpoch(request: QueryCurrentEpochRequest, initRequest?: fm.InitReq): Promise<QueryCurrentEpochResponse> {
    return fm.fetchReq(`/evmos/epochs/v1/current_epoch?${fm.renderURLSearchParams({
      ...request
    }, [])}`, {
      ...initRequest,
      method: "GET"
    });
  }
}
export class QueryClientImpl {
  private readonly url: string;
  constructor(url: string) {
    this.url = url;
  }
  /** EpochInfos provide running epochInfos */
  async epochInfos(req: QueryEpochsInfoRequest, headers?: HeadersInit): Promise<QueryEpochsInfoResponse> {
    return Query.epochInfos(req, {
      headers,
      pathPrefix: this.url
    });
  }
  /** CurrentEpoch provide current epoch of specified identifier */
  async currentEpoch(req: QueryCurrentEpochRequest, headers?: HeadersInit): Promise<QueryCurrentEpochResponse> {
    return Query.currentEpoch(req, {
      headers,
      pathPrefix: this.url
    });
  }
}