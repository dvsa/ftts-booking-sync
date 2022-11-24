export const toNumberOrDefault = (input: string | undefined, defaultValue: number): number => {
  if (!input) {
    return defaultValue;
  }
  const number = Number(input);
  if (Number.isNaN(number)) {
    return defaultValue;
  }
  if (number < 0) {
    return defaultValue;
  }
  return number;
};
