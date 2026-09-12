const calendarDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** Accepts Unix seconds, matching the gift API. */
export function formatDate(timestamp: number) {
  return calendarDate.format(new Date(timestamp * 1000));
}

export function formatTimeLeft(timestamp: number, now = Date.now()) {
  const remaining = timestamp * 1000 - now;
  if (remaining <= 0) return "Expired";
  if (remaining < 86400000) return "Less than a day left";
  const days = Math.ceil(remaining / 86400000);
  return `${days} ${days === 1 ? "day" : "days"} left`;
}

export function formatRegistrationDuration(seconds: number) {
  const years = seconds / 31536000;
  return `${years} ${years === 1 ? "year" : "years"}`;
}
