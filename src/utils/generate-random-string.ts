export const generateBalancedRandomString = (length = 10): string => {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const half = Math.floor(length / 2);

  const result: string[] = [];

  // Tambah huruf
  for (let i = 0; i < half; i++) {
    result.push(letters[Math.floor(Math.random() * letters.length)]);
  }

  // Tambah angka
  for (let i = 0; i < length - half; i++) {
    result.push(numbers[Math.floor(Math.random() * numbers.length)]);
  }

  // Acak urutan
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join("");
};
