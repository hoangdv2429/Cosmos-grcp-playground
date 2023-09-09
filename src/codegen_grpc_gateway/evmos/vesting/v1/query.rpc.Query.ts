import * as fm from "../../../grpc-gateway";
import { QueryBalancesRequest, QueryBalancesResponse } from "./query";
export class Query {
  /** Retrieves the unvested, vested and locked tokens for a vesting account */
  static balances(request: QueryBalancesRequest, initRequest?: fm.InitReq): Promise<QueryBalancesResponse> {
    return fm.fetchReq(`/evmos/vesting/v1/balances/${request["address"]}?${fm.renderURLSearchParams({
      ...request
    }, ["address"])}`, {
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
  /** Retrieves the unvested, vested and locked tokens for a vesting account */
  async balances(req: QueryBalancesRequest, headers?: HeadersInit): Promise<QueryBalancesResponse> {
    return Query.balances(req, {
      headers,
      pathPrefix: this.url
    });
  }
}