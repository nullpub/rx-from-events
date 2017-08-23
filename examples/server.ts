/// <reference path="../node_modules/@types/node/index.d.ts" />
'use strict';

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { fromEvents, ServerMap, ResponseMap } from '../src/';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/reduce';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/do';

interface Ctx {
  request: IncomingMessage;
  response: ServerResponse;
}

const server = createServer();
const obs = fromEvents<Ctx>(ServerMap, server);
const parser = (req: IncomingMessage) => fromEvents<string>(ResponseMap, req)
  .reduce((body, data) => body += data, '');
const sub = {
  next: (ctx: Ctx) => console.log('Got a request', ctx.request.method),
  error: (e: Error) => console.error('Uh oh!', e),
  complete: () => console.log('Server is closed')
}

const post = obs.filter(ctx => ctx.request.method === 'POST')
  .mergeMap(ctx => parser(ctx.request), (ctx, body) => ({...ctx, body}))
  .do(({response, body}) => body.length ? response.end(body) : response.end('No Data!'));
  
const get = obs.filter(ctx => ctx.request.method === 'GET')
  .do(ctx => ctx.response.end('Hello World'));

post.subscribe(sub);
get.subscribe(sub);

server.listen(8080, 'localhost');
