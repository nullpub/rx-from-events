# rxjs fromEvents
Like rxjs Observable.fromEvent() but with multiple events tied to multiple endpoints.

## Motivation
The fromEvent method is great for handling single type event emitters such as onClick in the browser. In the land of nodejs, however, EventEmitter has a bit more complexity. For example, the standard way for handling a simple http request in node looks like this:

```ts
import { request } from 'http';

const handler = res => {
  let body = '';
  res.on('data', data => body += data);
  res.on('end', () => console.log(body));
}
const req = request(options, handler).end();
req.on('error', err => console.error('Got an error', err));
```

While this is a perfectly decent way to handle things, we don't have any easy way to chain errors through the request/response flow. EventEmitters by their nature are loosely coupled, so http errors and actual socket errors are handled in different scopes. From a programming perspective I want a cleaner api for an http request. fromEvents is meant to get me most of the way there. Here is how we can handle http requests with fromEvents.

```ts
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
```

This is, obviously, more code. However, the flow from the request object to the response object is explicit now. An error on the request emitter will stop us from mapping to the the response object, so we can properly chain events from one observable to the next.

### More to come...