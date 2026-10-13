// Source lines grouped by the corresponding trace/pseudocode instruction.
export const algorithmCode = {
  bubble: [
    ["for (let end = a.length - 1; end > 0; end--) {"],
    ["  let swapped = false;"],
    ["  for (let j = 0; j < end; j++) {", "    if (a[j] > a[j + 1]) {"],
    [
      "      [a[j], a[j + 1]] = [a[j + 1], a[j]];",
      "      swapped = true;",
      "    }",
      "  }",
    ],
    ["  // a[end] is in its final position."],
    ["  if (!swapped) break;", "}"],
  ],
  selection: [
    ["for (let i = 0; i < a.length - 1; i++) {"],
    ["  let minimum = i;"],
    [
      "  for (let j = i + 1; j < a.length; j++) {",
      "    if (a[j] < a[minimum]) {",
    ],
    ["      minimum = j;", "    }", "  }"],
    [
      "  if (minimum !== i) {",
      "    [a[i], a[minimum]] = [a[minimum], a[i]];",
      "  }",
    ],
    ["  // a[i] is in its final position.", "}"],
  ],
  insertion: [
    ["for (let i = 1; i < a.length; i++) {"],
    ["  const key = a[i];", "  let j = i - 1;"],
    ["  while (j >= 0 && a[j] > key) {"],
    ["    a[j + 1] = a[j];", "    j--;", "  }"],
    ["  a[j + 1] = key;"],
    ["}"],
  ],
  merge: [
    [
      "function mergeSort(lo, hi) {",
      "  if (hi - lo < 2) return;",
      "  const mid = (lo + hi) >> 1;",
    ],
    [
      "  mergeSort(lo, mid);",
      "  mergeSort(mid, hi);",
      "  const left = a.slice(lo, mid);",
      "  const right = a.slice(mid, hi);",
      "  const buffer = [];",
      "  let i = 0, j = 0;",
    ],
    [
      "  while (i < left.length && j < right.length) {",
      "    if (left[i] <= right[j]) {",
    ],
    [
      "      buffer.push(left[i++]);",
      "    } else {",
      "      buffer.push(right[j++]);",
      "    }",
      "  }",
      "  buffer.push(...left.slice(i), ...right.slice(j));",
    ],
    ["  buffer.forEach((value, k) => { a[lo + k] = value; });"],
    ["}", "mergeSort(0, a.length);"],
  ],
  quick: [
    [
      "function quickSort(lo, hi) {",
      "  if (lo >= hi) return;",
      "  const pivot = a[hi];",
      "  let i = lo;",
    ],
    ["  for (let j = lo; j < hi; j++) {", "    if (a[j] <= pivot) {"],
    [
      "      if (i !== j) [a[i], a[j]] = [a[j], a[i]];",
      "      i++;",
      "    }",
      "  }",
    ],
    ["  if (i !== hi) [a[i], a[hi]] = [a[hi], a[i]];"],
    ["  quickSort(lo, i - 1);", "  quickSort(i + 1, hi);"],
    ["}", "quickSort(0, a.length - 1);"],
  ],
};
export function sourceFor(algorithm) {
  return algorithmCode[algorithm].flat().join("\n");
}
