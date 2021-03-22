export const toNumberOrDefault = (input: string | undefined, defaultValue: number): number => {
  if (!input) {
    return defaultValue;
  }
  const number = Number(input);
  if (Number.isNaN(number)) {
    return defaultValue;
  }
  return number;
};
