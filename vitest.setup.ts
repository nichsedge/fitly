import { vi, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';

// Set up fake IndexedDB
const dom = new JSDOM('', { url: 'http://localhost' });
global.window = dom.window as unknown as Window & typeof globalThis;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLElement.prototype.scrollIntoView = vi.fn();
global.HTMLElement.prototype.focus = vi.fn();
global.HTMLAnchorElement = dom.window.HTMLAnchorElement;
global.HTMLButtonElement = dom.window.HTMLButtonElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
global.HTMLSelectElement = dom.window.HTMLSelectElement;
global.HTMLDivElement = dom.window.HTMLDivElement;
global.HTMLSpanElement = dom.window.HTMLSpanElement;
global.HTMLLabelElement = dom.window.HTMLLabelElement;
global.HTMLFormElement = dom.window.HTMLFormElement;
global.HTMLImageElement = dom.window.HTMLImageElement;
global.HTMLDialogElement = dom.window.HTMLDialogElement;
global.HTMLUListElement = dom.window.HTMLUListElement;
global.HTMLLIElement = dom.window.HTMLLIElement;
global.HTMLParagraphElement = dom.window.HTMLParagraphElement;
global.HTMLStyleElement = dom.window.HTMLStyleElement;
global.HTMLScriptElement = dom.window.HTMLScriptElement;
global.Node = dom.window.Node;
global.Element = dom.window.Element;
global.NodeList = dom.window.NodeList;
global.HTMLCollection = dom.window.HTMLCollection;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;
global.MouseEvent = dom.window.MouseEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;
global.PointerEvent = dom.window.PointerEvent;
global.TouchEvent = dom.window.TouchEvent;
global.FocusEvent = dom.window.FocusEvent;
global.DragEvent = dom.window.DragEvent;
global.SubmitEvent = dom.window.SubmitEvent;
global.InputEvent = dom.window.InputEvent;
global.FormData = dom.window.FormData;
global.File = dom.window.File;
global.Blob = dom.window.Blob;
global.URL = dom.window.URL;
global.URLSearchParams = dom.window.URLSearchParams;
global.Request = dom.window.Request;
global.Response = dom.window.Response;
global.Headers = dom.window.Headers;
global.fetch = vi.fn();
global.localStorage = dom.window.localStorage;
global.sessionStorage = dom.window.sessionStorage;
// fake-indexeddb handles IndexedDB globals automatically

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    })),
    subtle: dom.window.crypto.subtle,
    getRandomValues: ((arr: Uint8Array | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | BigInt64Array | BigUint64Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }) as <T extends ArrayBufferView>(array: T) => T,
  },
  configurable: true,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia
global.matchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Suppress console.error in tests
const originalError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (
      args[0]?.includes?.('Warning: ReactDOM.render is no longer supported') ||
      args[0]?.includes?.('act(...)') ||
      args[0]?.includes?.('ReactDOMTestUtils.act')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});