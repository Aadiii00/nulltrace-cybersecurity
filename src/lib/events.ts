import { EventEmitter } from 'events';

class ScanEventEmitter extends EventEmitter {}

// Attach ScanEventEmitter to global scope in development to prevent duplication on Next.js hot-reloading.
const globalForEvents = global as unknown as { scanEvents: ScanEventEmitter };
export const scanEvents = globalForEvents.scanEvents || new ScanEventEmitter();

if (process.env.NODE_ENV !== 'production') {
  globalForEvents.scanEvents = scanEvents;
}
