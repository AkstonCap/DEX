export function formatNumberWithLeadingZeros(number, decimals) {
  const parts = number.toExponential(decimals).split('e');
  const base = parts[0];
  const exponent = parseInt(parts[1], 10);

  if (exponent >= 0) {
    return number.toFixed(decimals);
  }

  const leadingZeros = Math.abs(exponent) - 1;
  const significantDigits = base.replace('.', '');

  // Return as a React fragment with subscript
  return (
    <>
      0.0<sub>{leadingZeros}</sub>{significantDigits.slice(1)}
    </>
  );
}