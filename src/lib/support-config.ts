/**
 * Support / donation details.
 *
 * All values are configurable through environment variables so the numbers can
 * change without a code edit. Anything empty is simply hidden on the page.
 */
const env = import.meta.env as Record<string, string | undefined>;

function val(key: string, fallback = "") {
  return (env[key] ?? "").trim() || fallback;
}

export const SUPPORT_CONTACT_EMAIL = val(
  "VITE_SUPPORT_EMAIL",
  "right2read.net@gmail.com",
);

export const SUPPORT_MOBILE_MONEY = {
  number: val("VITE_SUPPORT_MOMO_NUMBER"),
  name: val("VITE_SUPPORT_MOMO_NAME"),
  network: val("VITE_SUPPORT_MOMO_NETWORK"),
};

export const SUPPORT_BANK = {
  accountNumber: val("VITE_SUPPORT_BANK_ACCOUNT"),
  accountName: val("VITE_SUPPORT_BANK_NAME"),
  bank: val("VITE_SUPPORT_BANK_BANK"),
  branch: val("VITE_SUPPORT_BANK_BRANCH"),
};

export const hasMobileMoney = Boolean(SUPPORT_MOBILE_MONEY.number);
export const hasBank = Boolean(SUPPORT_BANK.accountNumber);
