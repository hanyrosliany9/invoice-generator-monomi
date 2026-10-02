import { Transform } from "class-transformer";
import { wibStartOfDay, wibEndOfDay, wibDateStr } from "../utils/wib-date.util";

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

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Body-date transform: a bare "YYYY-MM-DD" is the start of that WIB calendar
 * day (Prisma DateTime rejects bare dates, which used to surface as a 500).
 * Full ISO datetimes pass through untouched. Anything unparseable is left as
 * is so `@IsDateString({ strict: true })` rejects it with a 400.
 */
export const WibDateInput = () =>
  Transform(({ value }) => {
    if (typeof value !== "string" || !DATE_ONLY.test(value)) return value;
    const d = new Date(`${value}T00:00:00+07:00`);
    // Date rolls overflowed days (2026-02-30) over; leave those for the validator.
    return !Number.isNaN(d.getTime()) && wibDateStr(d) === value ? d.toISOString() : value;
  });
