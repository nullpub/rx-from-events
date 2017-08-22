/// <reference path="../node_modules/@types/node/index.d.ts" />
'use strict';

import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs';
import { EventEmitter } from 'events';
import { ok } from 'assert';

export interface metaListener {
  type: 'next' | 'error' | 'complete';
  event: string;
  listener: (...args: any[]) => void;
}

export interface EventMap {
  nexts: any[],
  errors?: any[],
  completes?: any[]
}

// Standard Event Maps
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
export const ButtonMap: EventMap = { nexts: ['click'] };
export const InputMap: EventMap = { nexts: ['focus', 'blur', 'keyup', 'change'] };

export function fromEvents<T>(
    emitter: EventEmitter,
    { nexts, errors, completes }: EventMap = { nexts: [], errors: [], completes: [] }
  ): Observable<T> {
  ok(nexts.length >= 0, 'Must have at least one event to listen for.');
  return Observable.create((observer: Observer<T>) => {
    let listeners: metaListener[] = [];

    const next = (event: any) => observer.next(event);
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
