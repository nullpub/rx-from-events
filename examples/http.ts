/// <reference path="../node_modules/@types/node/index.d.ts" />
'use strict';

import { request, IncomingMessage } from 'https';
import { fromEvents, RequestMap, ResponseMap } from '../src/';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/reduce';
import 'rxjs/add/operator/do';

const options = { host: 'ethe.us' };
const req = request(options);
req.end();

const obs = fromEvents<IncomingMessage>(req, RequestMap)

obs
  .do(res => res.setEncoding('utf8'))
  .mergeMap(res => fromEvents<string>(res, ResponseMap))
  .reduce((body, data) => body += data)
  .subscribe(
    body => console.log(body),
    error => console.error(error),
    () => console.log('All done!')
  );