import { Fraction } from "@pancakeswap/swap-sdk-core";

export function formatFraction(fraction?: Fraction | null | undefined, precision: number | undefined = 6) {
  if (!fraction || fraction.denominator === 0n) {
    return undefined;
  }
  if (fraction.greaterThan(10n ** BigInt(precision))) {
    return fraction.toFixed(0);
  }
  return fraction.toSignificant(precision);
}

export function parseNumberToFraction(num: number, precision = 6) {
  if (Number.isNaN(num) || !Number.isFinite(num)) {
    return undefined;
  }
  const scalar = 10 ** precision;
  return new Fraction(BigInt(Math.floor(num * scalar)), BigInt(scalar));
}
