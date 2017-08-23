/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/// <reference path="../node_modules/@types/node/index.d.ts" />
'use strict';

import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs';
import { EventEmitter } from 'events';
import { ok } from 'assert';

export interface metaListener {
  type: 'next' | 'error' | 'complete';
  event: any;
  listener: (...args: any[]) => void;
}

export interface EventMap {
  nexts: any[];
  errors?: any[];
  completes?: any[];
  projector?: (...args: any[]) => any;
}

// Standard Event Maps
export const ReadableStreamMap: EventMap = {
  nexts: ['data'],
  errors: ['error'],
  completes: ['end', 'close']
}
export const ServerMap: EventMap = {
  nexts: ['request'],
  errors: ['error'],
  completes: ['close'],
  projector: (request, response) => ({request, response})
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
export const ButtonMap: EventMap = { nexts: ['click'] };
export const InputMap: EventMap = { nexts: ['focus', 'blur', 'keyup', 'change'] };

const defaultEventMap: EventMap = { nexts: [], errors: [], completes: [], projector: (...args) => args }

export function fromEvents<T>(
    { nexts, errors, completes, projector }: EventMap = defaultEventMap,
    emitter: EventEmitter
  ): Observable<T> {
  ok(nexts.length >= 0, 'Must have at least one event to listen for.');
  const proj = typeof projector === 'function' ? projector : (...args: T[]) => args;

  return Observable.create((observer: Observer<T>) => {
    let listeners: metaListener[] = [];

    const next = (...event: any[]) => observer.next(proj(...event));
    const error = (event: any) => observer.error(event);
    const complete = () => observer.complete();

    nexts.forEach(n => {
      emitter.on(n, next);
      listeners.push({type: 'next', event: n, listener: next});
    });
    errors.forEach(e => {
      emitter.on(e, error); // Could use .once but we already unsubscribe on error/complete
      listeners.push({type: 'error', event: e, listener: error})
    });
    completes.forEach(c => {
      emitter.on(c, complete);
      listeners.push({type: 'complete', event: c, listener: complete})
    });
    
    return () => listeners.forEach(l => emitter.removeListener(l.event, l.listener));
  });
}
