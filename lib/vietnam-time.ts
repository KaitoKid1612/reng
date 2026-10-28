// Classes run on Vietnam time (UTC+7, no daylight saving), so server and browser render the
// same datetime-local value regardless of the device time zone.
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

export function toVietnamInput(iso: string) {
  if (!iso) {
    return "";
  }
  return new Date(Date.parse(iso) + VIETNAM_OFFSET_MS).toISOString().slice(0, 16);
}

export function fromVietnamInput(value: string) {
  const instant = Date.parse(`${value}:00+07:00`);
  return Number.isNaN(instant) ? "" : new Date(instant).toISOString();
}
