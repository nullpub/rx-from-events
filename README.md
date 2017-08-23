# rxjs fromEvents
Like rxjs Observable.fromEvent() but with multiple events tied to multiple endpoints.

## Motivation
The fromEvent method is great for handling single type event emitters such as onClick in the browser. In the land of nodejs, however, EventEmitter has a bit more complexity. For example, the standard way for handling a simple http request in node looks like this:

```ts
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
const options = { host: 'ethe.us' };
const req = request(options);
req.end();

const obs = fromEvents<IncomingMessage>(RequestMap, req)

obs
  .do(res => res.setEncoding('utf8'))
  .mergeMap(res => fromEvents<string>(ResponseMap, res))
  .reduce((body, data) => body += data)
  .subscribe(
    body => console.log(body),
    error => console.error(error),
    () => console.log('All done!')
  );
```

This is, obviously, more code. However, the flow from the request object to the response object is explicit now. An error on the request emitter will stop us from mapping to the the response object, so we can properly chain events from one observable to the next.

## Installation and Usage
If you're using ES module imports or Typescript you can pull in fromEvents directly.

```ts
import { fromEvents } from '@nll/rx-from-events';
import { createReadStream } from 'fs';

const stream = createReadStream('./example.ts', {encoding: 'utf-8'});
const obs = fromEvents<string>(ReadableStreamMap, stream);

obs.subscribe(n => console.log(n));
```

If you're using CommonJS modules you can access the functions using require.

```js
const { fromEvents } = require('@nll/rx-from-events');
const { createReadStream } = require('fs');

const stream = createReadStream('./example.ts', {encoding: 'utf-8'});
const obs = fromEvents(ReadableStreamMap, stream);

obs.subscribe(n => console.log(n));
```

If you don't like destructuring or are targetting ES5 you can of course do things the long way.

```js
var fromEvents = require('@nll/rx-from-events').fromEvents;
var createReadStream = require('fs').createReadStream;

var stream = createReadStream('./example.ts', {encoding: 'utf-8'});
var obs = fromEvents(ReadableStreamMap, stream);

obs.subscribe(n => console.log(n));
```

## API
This module was written in native typescript with type definitions automatically created. For those without types here are the function signatures.

#### fromEvents\<T>(*map*: EventMap, *emitter*: EventEmitter): Observable\<T>

The magic here lies in the EventMap interface. There really isn't any magic, here's what the interface looks like in the source code.

```ts
export interface EventMap {
  nexts: any[];
  errors?: any[];
  completes?: any[];
  projector?: (...args: any[]) => any;
}
```

Basically, what's happening under the hood is that each item in each array is mapped to the associated Observable channel, like this:

```ts
nexts.forEach(n => emitter.on(n, (...args) => observable.next(projector(...args))));
errors.forEach(n => emitter.on(n, observable.error));
completes.forEach(n => emitter.on(n, observable.complete));
```

It's a little more complicated than this snippet, but you get the idea.. Additionally, there is code to cleanup the listeners after an error or complete event occurs, so you don't have to.

**What the hell is the projector?**

Glad you asked! An Observable expects a single object for each event. However, event listeners can accept multiple objects. For example, the Http.Server emitter emits both a request and a response object to any listener attached to the ```'request'``` event. In order for us to capture both of those arguments, we can implement the concept of a projector. A projector receives all of the arguments that a listener would and is expected to serialize them into a single object.

For example, the provided ```ServerMap``` event map has the following projector:

```ts
projector = (request, response) => ({request, response});
```

Easy peazy..

### Helper EventMap Objects
There are a handful of predefined EventMaps included in this module. They are useful for keeping your fromEvents calls a bit simpler. It's easiest for me to simply copy the source for these here, as both documentation and as examples for creating your own EventMap definitions.

```ts
export const ReadableStreamMap: EventMap = {
  nexts: ['data'],
  errors: ['error'],
  completes: ['end', 'close']
}
export const RequestMap: EventMap = {
  nexts: ['response'],
  errors: ['error'],
  completes: ['abort', 'aborted', 'close', 'end']
}
export const ResponseMap: EventMap = {
  nexts: ['data'],
  errors: ['error'],
  completes: ['abort', 'aborted', 'close', 'end']
}
export const ButtonMap: EventMap = {
  nexts: ['click']
};
export const InputMap: EventMap = {
  nexts: ['focus', 'blur', 'keyup', 'change']
};
```

Notice that the only property of an EventMap that is required is the ```nexts``` property. Also, keep in mind that the EventType property for EventEmitter is of type ```<any>``` so you can supply event types other than ```string```.

## Minorly Functional
The fromEvents function was written to be curried. If you've got lodash around you can make your life a little bit easier.

```ts
import { createReadableStream } from 'fs';
import { fromEvents, ReadableStreamMap } from '@nll/rx-from-events';
import { curry } from 'lodash';
import 'rxjs/add/operator/reduce';

const fromReadStream = curry(fromEvents)(ReadableStreamMap);
const readFile = (path, opts) => fromReadStream(createReadableStream(path, opts));

readFile('./README.md', {encoding: 'utf-8'})
  .reduce((a, c) => a += c)
  .subscribe(
    result => console.log(result),
    error => console.error(error),
    () => console.log('All done!')
  );
```

