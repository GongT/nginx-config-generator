import {IServiceStatus} from "../config.define";
import {HttpTemplate} from "../template/http-template";
import {StreamServerTemplate} from "../template/stream-server-template";

export interface ServerGenInput<ServerTempl> {
	outcome: ServerTempl;
	income: ServerTempl;
	including: any[];
	status: IServiceStatus;
}
export type HttpServerGenData = ServerGenInput<HttpTemplate>;
export type StreamServerGenData = ServerGenInput<StreamServerTemplate>;
