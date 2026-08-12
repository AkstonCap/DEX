import React from 'react';

export function formatNumberWithLeadingZeros(number, decimals, tokenDecimals=6) {
  // Handle invalid inputs
  if (number === null || number === undefined || isNaN(number)) {
    return 'N/A';
  }

  // Handle exactly zero
  if (number === 0) {
    return number.toFixed(decimals);
  }

  const absNumber = Math.abs(number);
  
  // Handle numbers >= 1 (normal large numbers)
  if (absNumber >= 1) {
    if (tokenDecimals > 1) {
      return number.toFixed(2);
    } else {
      return number.toFixed(Math.max(0, tokenDecimals));
    }
  }

  // compute the smallest value that still prints as "0.00...1"
  const threshold = 1 / Math.pow(10, decimals);

  // Handle numbers between threshold and 1 (normal small decimals)
  if (absNumber >= threshold) {
    const [base0, exp0] = number.toExponential(decimals).split('e');
    const exponent0 = parseInt(exp0, 10);
    const leadingZeros0 = Math.abs(exponent0) - 1;
    return number.toFixed(Math.max(decimals + leadingZeros0, 2));
  }

  // Very small numbers -> subscript zeros
  const [base, exp] = number.toExponential(decimals-1).split('e');
  const exponent = parseInt(exp, 10);
  const leadingZeros = Math.abs(exponent) - 1;
  const digits = base.replace('.', '');

  return (
    <>
      0.0<sub>{leadingZeros}</sub>
      {digits.slice(0, Math.max(1, tokenDecimals - leadingZeros))}
    </>
  );
}
