/**
 * Pure validation helpers for the profile form's date inputs.
 *
 * `<input type="date">` does not push partial entries (e.g. a bare "2029") into
 * React state — the half-typed value lives only in the DOM control, where the
 * browser exposes it as `validity.badInput`. Saving such a field used to coerce
 * silently to `null` (issue #20), quietly discarding passport / IDP expiry that
 * the rules engine depends on. The form reads each control's DOM validity at
 * save time and feeds it here to decide whether the save is allowed.
 */

export type DateFieldState = {
  id: string;
  label: string;
  /** The value React managed to capture (null if empty or mid-edit). */
  value: string | null;
  /** The browser's `input.validity.badInput` for this control. */
  badInput: boolean;
};

/** True only for a complete, real calendar date in strict YYYY-MM-DD form. */
export function isCompleteISODate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/**
 * Returns the date fields that must block a save: either the control holds an
 * unparseable/partial entry (`badInput`), or a non-empty value isn't a complete
 * valid date. Empty (null) values are allowed — these fields are optional.
 */
export function findInvalidDateFields(
  fields: DateFieldState[],
): { id: string; label: string }[] {
  return fields
    .filter((f) => f.badInput || (f.value !== null && !isCompleteISODate(f.value)))
    .map(({ id, label }) => ({ id, label }));
}
