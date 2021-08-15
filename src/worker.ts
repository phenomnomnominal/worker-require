import { ok } from 'assert';
import { parentPort, workerData } from 'worker_threads';

import { expose } from './vendor/comlink';
import nodeEndpoint from './vendor/node-adapter';

import { setHandlers } from './handlers';

ok(parentPort && workerData);

setHandlers();

// eslint-disable-next-line
const required = require(workerData);
expose(required, nodeEndpoint(parentPort));
