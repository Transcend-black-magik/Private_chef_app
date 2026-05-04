type CurrencyConfig = {
  code: string;
  locale: string;
};

const COUNTRY_CURRENCY_MAP: Record<string, CurrencyConfig> = {
  CA: { code: "CAD", locale: "en-CA" },
  GB: { code: "GBP", locale: "en-GB" },
  NG: { code: "NGN", locale: "en-NG" },
  US: { code: "USD", locale: "en-US" },
};

export function getCurrencyConfig(countryCode?: string | null): CurrencyConfig {
  if (!countryCode) {
    return COUNTRY_CURRENCY_MAP.US;
  }

  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || COUNTRY_CURRENCY_MAP.US;
}

export function formatCurrency(amount: number, countryCode?: string | null) {
  const config = getCurrencyConfig(countryCode);

  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.code,
    maximumFractionDigits: 2,
  }).format(amount);
}
