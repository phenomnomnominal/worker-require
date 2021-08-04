import * as path from 'path';

export const WORKER_PATH = path.resolve(
  require.resolve('@phenomnomnominal/worker-require'),
  '../worker.js'
);

export const TO_CLONEABLE = Symbol('toCloneable');
