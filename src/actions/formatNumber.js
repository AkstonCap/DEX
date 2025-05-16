import React from 'react';

export function formatNumberWithLeadingZeros(number, decimals) {
  // compute the smallest value that still prints as “0.00…1”
  const threshold = 1 / Math.pow(10, decimals);

  // ≥ threshold (or exactly zero) → normal fixed
  if (number === 0 || (Math.abs(number) >= threshold && Math.abs(number) <= 1 ) ) {
    const [base0, exp0] = number.toExponential(decimals).split('e');
    const exponent0 = parseInt(exp0, 10);              // e.g. "-4"
    const leadingZeros0 = Math.abs(exponent0) - 1;      // how many zeros before the first sig‐digit
    return number.toFixed(Math.max(decimals+leadingZeros0, 2));
  } else if (Math.abs(number) >= 1) {
    // ≥ threshold → normal fixed
    return number.toFixed(2);
  }

  // very small numbers → subscript zeros
  const [base, exp] = number.toExponential(decimals-1).split('e');
  const exponent = parseInt(exp, 10);              // e.g. "-4"
  const leadingZeros = Math.abs(exponent) - 1;      // how many zeros before the first sig‐digit
  const digits = base.replace('.', '');             // “1.234” → “1234”

  return (
    <>
      0.0<sub>{leadingZeros}</sub>
      {digits.slice(0)}
    </>
  );
}