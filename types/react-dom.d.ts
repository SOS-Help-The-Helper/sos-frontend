declare module 'react-dom' {
  import { Key, ReactNode, ReactPortal } from 'react';
  export function createPortal(
    children: ReactNode,
    container: Element | DocumentFragment,
    key?: Key | null,
  ): ReactPortal;
  export const version: string;
  export function flushSync<R>(fn: () => R): R;
}
