import "source-map-support/register";

import {init as ensureFolders} from "./init/folders";
import {initServices} from "./init/services";

ensureFolders();
initServices();

require('./handler');
