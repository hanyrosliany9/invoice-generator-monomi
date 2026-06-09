import { Transform } from "class-transformer";
import { wibStartOfDay, wibEndOfDay } from "../utils/wib-date.util";

/**
 * Query-date transforms that interpret an incoming "YYYY-MM-DD" (or ISO) value
 * in WIB, not UTC. The business runs in WIB (UTC+7) while timestamps are stored
 * in UTC, so a bare date parsed as midnight UTC silently drops/loses a WIB day
 * around the evening boundary (e.g. a journal at 2026-06-08T19:41Z is already
 * 2026-06-09 in WIB). These keep "as of <date>" filters WIB-correct everywhere.
 */

/** Lower bound: the first instant of the WIB calendar day. */
export const WibStartOfDay = () =>
  Transform(({ value }) =>
    value === undefined || value === null || value === ""
      ? undefined
      : wibStartOfDay(new Date(value)),
  );

/** Upper bound (INCLUSIVE): the last instant of the WIB calendar day. */
export const WibEndOfDay = () =>
  Transform(({ value }) =>
    value === undefined || value === null || value === ""
      ? undefined
      : wibEndOfDay(new Date(value)),
  );
