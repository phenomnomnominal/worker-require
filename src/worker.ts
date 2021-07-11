import { ok } from 'assert';
import { expose } from 'comlink';
import nodeEndpoint from 'comlink/dist/umd/node-adapter';
import { parentPort, workerData } from 'worker_threads';

import { setHandlers } from './handlers';

ok(parentPort, workerData);

setHandlers();

// eslint-disable-next-line
const required = require(workerData);
expose(required, nodeEndpoint(parentPort));
