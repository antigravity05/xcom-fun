const compactNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

export const formatCompactNumber = (value: number) => {
  return compactNumberFormatter.format(value);
};

export const formatRelativeTime = (isoTimestamp: string) => {
  const date = new Date(isoTimestamp).getTime();
  const diffSeconds = Math.round((date - Date.now()) / 1000);
  const intervals = [
    { amount: 60, unit: "second" },
    { amount: 60, unit: "minute" },
    { amount: 24, unit: "hour" },
    { amount: 7, unit: "day" },
    { amount: 4.34524, unit: "week" },
    { amount: 12, unit: "month" },
    { amount: Number.POSITIVE_INFINITY, unit: "year" },
  ] as const;

  let value = diffSeconds;
  let unit: Intl.RelativeTimeFormatUnit = "second";

  for (const interval of intervals) {
    if (Math.abs(value) < interval.amount) {
      unit = interval.unit;
      break;
    }

    value = Math.round(value / interval.amount);
  }

  return relativeTimeFormatter.format(value, unit);
};

export const shortenContractAddress = (value?: string) => {
  if (!value) {
    return null;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};
