/// <reference path="../node_modules/@types/node/index.d.ts" />
'use strict';

import { fromEvents, ReadableStreamMap } from '../src/';
import { createReadStream } from 'fs';
import 'rxjs/add/operator/reduce';

const stream = createReadStream('./example.ts', {encoding: 'utf-8'});
const obs = fromEvents<string>(ReadableStreamMap, stream);

obs
  .reduce((acc: string, curr: string) => acc += curr)
  .subscribe(
    n => console.log(n),
    e => console.error('Uh oh!', e),
    () => 'All Done!'
  );