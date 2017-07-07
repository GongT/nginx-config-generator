import {IServiceStatus} from "../../config.define";
import {LocationTemplate} from "../../template/location-template";
import {LocationBuilder} from "../location-builder";

export class StaticLocation extends LocationBuilder {
	buildTemplate(status: IServiceStatus): LocationTemplate {
		return undefined;
	}
}
