// Extended operations use immutable teaching snapshots, separate from storage costs.
export const extraOperations = {
  Array: [
    "Access",
    "Update",
    "Traverse",
    "Reverse",
    "Minimum",
    "Maximum",
    "Size",
    "Is empty",
    "Clear",
  ],
  "Linked list": [
    "Access",
    "Update",
    "Traverse",
    "Reverse",
    "Size",
    "Is empty",
    "Clear",
  ],
  Stack: ["Peek", "Search", "Traverse", "Size", "Is empty", "Clear"],
  Queue: ["Front", "Rear", "Search", "Traverse", "Size", "Is empty", "Clear"],
  "Binary tree": [
    "Remove",
    "Inorder",
    "Preorder",
    "Postorder",
    "Level order",
    "Minimum",
    "Maximum",
    "Height",
    "Size",
    "Is empty",
    "Clear",
  ],
  Graph: [
    "Depth-first search",
    "Add vertex",
    "Remove vertex",
    "Add edge",
    "Remove edge",
    "Neighbors",
    "Degree",
    "Size",
    "Is empty",
    "Clear",
  ],
  "Hash table": ["Traverse", "Size", "Is empty", "Clear"],
};
export function extendedTrace(type, initial, options, buildTree) {
  const { operation: op, value, index = 0, target = 0 } = options;
  if (!extraOperations[type]?.includes(op) || op === "Search") return null;
  let values = [...initial],
    edges = (options.edges || []).map((e) => [...e]);
  const events = [];
  const emit = (message, active = [], extra = {}) =>
    events.push({
      values: [...values],
      edges: edges.map((e) => [...e]),
      message,
      active: [...active],
      ...structuredClone(extra),
    });
  emit(`Start ${op.toLowerCase()} with ${values.length} values.`);
  const requireIndex = () => {
    if (!Number.isInteger(index) || index < 0 || index >= values.length)
      throw Error("Choose a valid node or position index.");
  };
  if (op === "Size" || op === "Is empty") {
    const size = type === "Binary tree" ? new Set(values).size : values.length;
    emit(
      op === "Size"
        ? `Size: ${size}${type === "Graph" ? ` vertices, ${edges.length} edges` : " values"}.`
        : `Is empty: ${size === 0}.`,
    );
    return events;
  }
  if (op === "Clear") {
    values = [];
    edges = [];
    emit("Clear complete. The structure is empty.");
    return events;
  }
  if (type === "Graph") {
    if (op === "Add vertex") {
      values.push(value);
      emit(`Add vertex ${values.length - 1} with value ${value}.`, [
        values.length - 1,
      ]);
      return events;
    }
    requireIndex();
    if (op === "Remove vertex") {
      emit(`Remove vertex ${index} and its incident edges.`, [index]);
      values.splice(index, 1);
      edges = edges
        .filter((e) => !e.includes(index))
        .map((e) => e.map((v) => (v > index ? v - 1 : v)));
      emit("Vertex removed. Remaining indices are compacted.");
      return events;
    }
    if (op === "Add edge" || op === "Remove edge") {
      if (
        !Number.isInteger(target) ||
        target < 0 ||
        target >= values.length ||
        target === index
      )
        throw Error("Choose two distinct valid vertex indices.");
      const exists = edges.some(
        ([a, b]) =>
          (a === index && b === target) || (a === target && b === index),
      );
      if (op === "Add edge" && !exists) edges.push([index, target]);
      if (op === "Remove edge")
        edges = edges.filter(
          ([a, b]) =>
            !((a === index && b === target) || (a === target && b === index)),
        );
      emit(
        `${op}: ${index} ↔ ${target}${op === "Add edge" && exists ? " already exists" : op === "Remove edge" && !exists ? " was absent" : ""}.`,
        [index, target],
      );
      return events;
    }
    const adjacent = (n) => [
      ...new Set(
        edges.flatMap(([a, b]) => (a === n ? [b] : b === n ? [a] : [])),
      ),
    ];
    if (op === "Neighbors" || op === "Degree") {
      const neighbors = adjacent(index);
      emit(
        op === "Degree"
          ? `Degree of vertex ${index}: ${neighbors.length}.`
          : `Neighbors of ${index}: ${neighbors.join(", ") || "none"}.`,
        [index, ...neighbors],
      );
      return events;
    }
    const visited = [],
      seen = new Set();
    function visit(n) {
      if (seen.has(n)) return;
      seen.add(n);
      visited.push(n);
      emit(`Visit vertex ${n} (${values[n]}).`, [n], { visited: [...visited] });
      for (const next of adjacent(n)) {
        if (!seen.has(next)) {
          emit(`Follow edge ${n} → ${next}.`, [n, next], {
            visited: [...visited],
          });
          visit(next);
        }
      }
    }
    visit(index);
    emit(
      `Traversal complete. Reached ${visited.length} of ${values.length} nodes.`,
      [],
      { visited },
    );
    return events;
  }
  if (type === "Binary tree") {
    let tree = buildTree(values);
    const output = [];
    const mark = (n) => {
      output.push(n.value);
      emit(
        `Visit ${n.value}. Order: ${output.join(" → ")}.`,
        [values.indexOf(n.value)],
        { order: [...output] },
      );
    };
    if (["Inorder", "Preorder", "Postorder"].includes(op)) {
      function walk(n) {
        if (!n) return;
        if (op === "Preorder") mark(n);
        walk(n.left);
        if (op === "Inorder") mark(n);
        walk(n.right);
        if (op === "Postorder") mark(n);
      }
      walk(tree);
      emit(`${op}: ${output.join(" → ") || "empty"}.`, [], { order: output });
      return events;
    }
    if (op === "Level order") {
      const queue = tree ? [tree] : [];
      while (queue.length) {
        const n = queue.shift();
        mark(n);
        if (n.left) queue.push(n.left);
        if (n.right) queue.push(n.right);
      }
      emit(`Level order: ${output.join(" → ") || "empty"}.`, [], {
        order: output,
      });
      return events;
    }
    if (op === "Height") {
      function height(n) {
        if (!n) return 0;
        emit(`Inspect ${n.value} while counting levels.`, [
          values.indexOf(n.value),
        ]);
        return 1 + Math.max(height(n.left), height(n.right));
      }
      const h = height(tree);
      emit(`Height: ${h} levels (empty = 0, leaf = 1).`);
      return events;
    }
    if (op === "Minimum" || op === "Maximum") {
      let n = tree,
        last = null;
      while (n) {
        last = n;
        emit(`Follow ${op === "Minimum" ? "left" : "right"} from ${n.value}.`, [
          values.indexOf(n.value),
        ]);
        n = n[op === "Minimum" ? "left" : "right"];
      }
      emit(
        last ? `${op}: ${last.value}.` : "The tree is empty.",
        last ? [values.indexOf(last.value)] : [],
      );
      return events;
    }
    if (op === "Remove") {
      function remove(n, key) {
        if (!n) return null;
        emit(`Compare ${key} with ${n.value}.`, [values.indexOf(n.value)]);
        if (key < n.value) n.left = remove(n.left, key);
        else if (key > n.value) n.right = remove(n.right, key);
        else {
          if (!n.left) return n.right;
          if (!n.right) return n.left;
          let successor = n.right;
          while (successor.left) successor = successor.left;
          emit(
            `Replace ${n.value} with inorder successor ${successor.value}.`,
            [values.indexOf(n.value), values.indexOf(successor.value)],
          );
          n.value = successor.value;
          n.right = remove(n.right, successor.value);
        }
        return n;
      }
      const found = values.includes(value);
      tree = remove(tree, value);
      values = [];
      function preorder(n) {
        if (n) {
          values.push(n.value);
          preorder(n.left);
          preorder(n.right);
        }
      }
      preorder(tree);
      emit(
        found
          ? `Removed ${value}; search-tree ordering is preserved.`
          : `${value} was not found.`,
      );
      return events;
    }
  }
  if (["Access", "Update"].includes(op)) {
    requireIndex();
    if (type === "Linked list")
      for (let i = 0; i <= index; i++)
        emit(`Follow link to position ${i}.`, [i]);
    if (op === "Update") {
      emit(`Replace ${values[index]} at ${index} with ${value}.`, [index]);
      values[index] = value;
    }
    emit(`Position ${index} contains ${values[index]}.`, [index]);
    return events;
  }
  if (["Peek", "Front", "Rear"].includes(op)) {
    const i = op === "Front" ? 0 : values.length - 1;
    emit(
      values.length
        ? `${op}: ${values[i]}. No value is removed.`
        : "The structure is empty.",
      values.length ? [i] : [],
    );
    return events;
  }
  if (op === "Reverse") {
    for (let l = 0, r = values.length - 1; l < r; l++, r--) {
      emit(`Exchange positions ${l} and ${r}.`, [l, r]);
      [values[l], values[r]] = [values[r], values[l]];
      emit(`Positions ${l} and ${r} exchanged.`, [l, r]);
    }
    emit("Reverse complete.");
    return events;
  }
  if (op === "Traverse") {
    values.forEach((v, i) => emit(`Visit position ${i}: ${v}.`, [i]));
    emit("Traversal complete.");
    return events;
  }
  if (op === "Minimum" || op === "Maximum") {
    let best = 0;
    values.forEach((v, i) => {
      if (op === "Minimum" ? v < values[best] : v > values[best]) best = i;
      emit(`Inspect ${v}; current ${op.toLowerCase()} is ${values[best]}.`, [
        i,
        best,
      ]);
    });
    emit(values.length ? `${op}: ${values[best]}.` : "The structure is empty.");
    return events;
  }
  return null;
}
export function operationCost(type, op) {
  if (["Size", "Is empty", "Peek", "Front", "Rear"].includes(op))
    return { time: "O(1) with stored size / endpoints", space: "O(1)" };
  if (type === "Graph")
    return {
      time: ["Add vertex"].includes(op)
        ? "O(1) amortized"
        : ["Add edge", "Remove edge", "Neighbors", "Degree"].includes(op)
          ? "O(V + E) in this edge-list model"
          : "O(V + E)",
      space:
        op === "Depth-first search" || op === "Breadth-first search"
          ? "O(V)"
          : "O(1) excluding storage",
    };
  if (type === "Binary tree")
    return {
      time: ["Insert", "Remove", "Search", "Minimum", "Maximum"].includes(op)
        ? "O(h), worst O(n)"
        : "O(n)",
      space: ["Remove", "Inorder", "Preorder", "Postorder", "Height"].includes(
        op,
      )
        ? "O(h)"
        : op === "Level order"
          ? "O(n)"
          : "O(1)",
    };
  if (type === "Hash table")
    return {
      time: ["Insert", "Remove", "Search"].includes(op)
        ? "O(1) average, O(n) worst"
        : "O(n + buckets)",
      space: "O(1)",
    };
  return {
    time:
      (type === "Array" && ["Access", "Update"].includes(op)) ||
      ["Push", "Pop", "Enqueue", "Dequeue"].includes(op)
        ? "O(1) with suitable storage"
        : "O(n)",
    space: "O(1)",
  };
}
