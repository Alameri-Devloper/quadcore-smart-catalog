export interface ProductEntryClock {
  now(): Date;
}

export const systemProductEntryClock: ProductEntryClock = Object.freeze({
  now: () => new Date(),
});
