import { AsyncLocalStorage } from "async_hooks";

export const informeAuditContext = new AsyncLocalStorage<number | null>();
