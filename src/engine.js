export const metadata = {
  bubble: {
    name: "Bubble sort",
    tag: "The fundamentals",
    description:
      "Compare neighbors. Swap when they’re out of order. With every pass, the largest remaining value finds its home.",
    best: "O(n)",
    average: "O(n²)",
    worst: "O(n²)",
    space: "O(1)",
    stable: true,
    code: [
      "for each pass through the array",
      "  swapped = false",
      "  compare adjacent values",
      "  if left > right: swap; swapped = true",
      "  mark the last value as sorted",
      "  if no swaps: stop",
    ],
    experiment:
      "Try an already sorted array. Early exit reduces the work to a single pass.",
  },
  selection: {
    name: "Selection sort",
    tag: "Find the minimum",
    description:
      "Scan the unsorted region for its smallest value, then move it to the next open position.",
    best: "O(n²)",
    average: "O(n²)",
    worst: "O(n²)",
    space: "O(1)",
    stable: false,
    code: [
      "for each position i",
      "  minimum = i",
      "  compare each remaining value to minimum",
      "  update minimum if smaller",
      "  swap minimum into position i",
      "  mark position i as sorted",
    ],
    experiment:
      "Compare sorted and reversed inputs: selection still scans every remaining value.",
  },
  insertion: {
    name: "Insertion sort",
    tag: "One at a time",
    description:
      "Save a key, shift larger values to the right, and insert the key into the growing sorted prefix.",
    best: "O(n)",
    average: "O(n²)",
    worst: "O(n²)",
    space: "O(1)",
    stable: true,
    code: [
      "for each position starting at 1",
      "  save value as key",
      "  compare previous value with key",
      "  shift larger value one place right",
      "  insert key into the open position",
      "finish when every key is inserted",
    ],
    experiment: "Try nearly sorted input. Insertion needs very few shifts.",
  },
  merge: {
    name: "Merge sort",
    tag: "Divide. Then conquer.",
    description:
      "Split the array into smaller ranges. Merge them back in order using a temporary buffer, taking the left value on ties.",
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n log n)",
    space: "O(n)",
    stable: true,
    code: [
      "split range at its midpoint",
      "sort the left and right ranges",
      "compare the front of each buffer",
      "take smaller value (left on ties)",
      "write merged buffer into array",
      "finish the merged range",
    ],
    experiment:
      "Compare with Bubble on reverse input. Merge keeps its balanced division of work.",
  },
  quick: {
    name: "Quick sort",
    tag: "A pivot changes everything",
    description:
      "Use the last value as a pivot. Partition smaller or equal values to its left, then sort the two remaining ranges.",
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n²)",
    space: "O(log n) avg · O(n) worst",
    stable: false,
    code: [
      "choose last value as pivot",
      "compare each value with pivot",
      "move values ≤ pivot to the left",
      "swap pivot into its final position",
      "recursively sort left and right ranges",
      "finish when ranges have at most one value",
    ],
    experiment:
      "Try sorted or all-equal input. Last-element pivots produce unbalanced partitions.",
  },
};
export function parseInput(text) {
  const tokens = text.trim().split(/[\s,]+/);
  if (!text.trim() || tokens.length < 2 || tokens.length > 64)
    throw Error("Enter 2–64 integers, separated by commas or spaces.");
  if (tokens.some((t) => !/^[-+]?\d+$/.test(t) || Math.abs(Number(t)) > 999))
    throw Error(
      "Use whole numbers between −999 and 999. Example: 12, -3, 12, 0, 7",
    );
  return tokens.map(Number);
}
export function generate(size, seed, preset = "random") {
  let s = seed >>> 0;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  let a = Array.from({ length: size }, () => 1 + Math.floor(rand() * 99));
  if (preset !== "random") a.sort((a, b) => a - b);
  if (preset === "reverse") a.reverse();
  if (preset === "nearly")
    for (let k = 0; k < Math.max(1, Math.floor(size / 10)); k++) {
      const i = Math.floor(rand() * (size - 1));
      [a[i], a[i + 1]] = [a[i + 1], a[i]];
    }
  return a;
}
export function trace(input, type) {
  let a = input.map((value, id) => ({ value, id })),
    events = [],
    metrics = { comparisons: 0, swaps: 0, writes: 0 },
    sorted = new Set();
  const emit = (
    kind,
    active = [],
    line = 0,
    explanation = "Ready. Press play to see the first operation.",
    auxiliary = null,
  ) =>
    events.push({
      kind,
      values: a.map((x) => ({ ...x })),
      active: [...active],
      sorted: [...sorted],
      line,
      explanation,
      auxiliary,
      metrics: { ...metrics },
    });
  const compare = (x, y, indices, line, aux = null) => {
    metrics.comparisons++;
    emit("compare", indices, line, `Compare ${x.value} with ${y.value}.`, aux);
    return x.value - y.value;
  };
  const swap = (i, j, line) => {
    if (i === j) return;
    [a[i], a[j]] = [a[j], a[i]];
    metrics.swaps++;
    metrics.writes += 2;
    emit("swap", [i, j], line, `Swap positions ${i} and ${j}.`);
  };
  const write = (i, x, line, aux) => {
    a[i] = x;
    metrics.writes++;
    emit("write", [i], line, `Write ${x.value} into position ${i}.`, aux);
  };
  emit("initial");
  const n = a.length;
  if (type === "bubble") {
    for (let end = n - 1; end > 0; end--) {
      let changed = false;
      for (let j = 0; j < end; j++)
        if (compare(a[j], a[j + 1], [j, j + 1], 2) > 0) {
          swap(j, j + 1, 3);
          changed = true;
        }
      sorted.add(end);
      emit("mark", [], 4, `Position ${end} is now final.`);
      if (!changed) break;
    }
  }
  if (type === "selection")
    for (let i = 0; i < n - 1; i++) {
      let m = i;
      for (let j = i + 1; j < n; j++)
        if (compare(a[j], a[m], [j, m], 2) < 0) {
          m = j;
          emit("mark", [m], 3, `${a[m].value} is the new minimum.`);
        }
      swap(i, m, 4);
      sorted.add(i);
      emit("mark", [], 5, `Position ${i} is now final.`);
    }
  if (type === "insertion")
    for (let i = 1; i < n; i++) {
      const key = a[i];
      const aux = `Saved key: ${key.value} · id ${key.id}`;
      emit("mark", [i], 1, `Save ${key.value} as the key.`, aux);
      let j = i - 1;
      while (j >= 0) {
        if (compare(a[j], key, [j], 2, aux) <= 0) break;
        write(j + 1, a[j], 3, aux);
        j--;
      }
      write(j + 1, key, 4, aux);
    }
  if (type === "merge") {
    const merge = (lo, hi) => {
      if (hi - lo < 2) return;
      let mid = (lo + hi) >> 1;
      emit("mark", [], 0, `Split range ${lo}…${hi - 1} at ${mid}.`);
      merge(lo, mid);
      merge(mid, hi);
      let l = a.slice(lo, mid),
        r = a.slice(mid, hi),
        b = [],
        i = 0,
        j = 0;
      const aux = () =>
        `Left: [${l.slice(i).map((x) => x.value)}] · Right: [${r.slice(j).map((x) => x.value)}]`;
      while (i < l.length && j < r.length) {
        if (compare(l[i], r[j], [], 2, aux()) <= 0) b.push(l[i++]);
        else b.push(r[j++]);
      }
      b.push(...l.slice(i), ...r.slice(j));
      b.forEach((v, k) =>
        write(lo + k, v, 4, `Merge buffer: [${b.map((x) => x.value)}]`),
      );
    };
    merge(0, n);
  }
  if (type === "quick") {
    const quick = (lo, hi) => {
      if (lo >= hi) return;
      const pivot = a[hi];
      emit(
        "mark",
        [hi],
        0,
        `Choose ${pivot.value} as pivot.`,
        `Pivot: ${pivot.value} at ${hi}`,
      );
      let i = lo;
      for (let j = lo; j < hi; j++)
        if (compare(a[j], pivot, [j, hi], 1, `Pivot: ${pivot.value}`) <= 0) {
          swap(i, j, 2);
          i++;
        }
      swap(i, hi, 3);
      sorted.add(i);
      emit("mark", [i], 3, `Pivot ${pivot.value} is in its final position.`);
      quick(lo, i - 1);
      quick(i + 1, hi);
    };
    quick(0, n - 1);
  }
  if (!metadata[type]) throw Error("Unknown algorithm");
  sorted = new Set(a.map((_, i) => i));
  emit("done", [], 5, "All in order. Every value has found its place.");
  return events;
}
export function advance(step, length, direction = 1) {
  return Math.max(0, Math.min(length - 1, step + direction));
}
