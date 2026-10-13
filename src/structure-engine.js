import { extraOperations, extendedTrace } from "./structure-operations.js";
export const structureInfo = {
  Array: {
    kind: "Linear · indexed",
    description:
      "Contiguous positions make direct access easy. Inserting or deleting shifts the values that follow.",
    operations: ["Insert", "Remove", "Search"],
    cost: "Access O(1) · Search / insert / remove O(n)",
  },
  "Linked list": {
    kind: "Linear · linked",
    description:
      "Each node points to its successor. Follow links to locate a position, then reconnect the chain.",
    operations: ["Insert", "Remove", "Search"],
    cost: "Search O(n) · Reconnect a known node O(1)",
  },
  Stack: {
    kind: "Linear · last in, first out",
    description:
      "Push adds at the top. Pop removes the most recently added value.",
    operations: ["Push", "Pop"],
    cost: "Push / pop O(1)",
  },
  Queue: {
    kind: "Linear · first in, first out",
    description:
      "Enqueue joins the back. Dequeue serves the value waiting at the front.",
    operations: ["Enqueue", "Dequeue"],
    cost: "Enqueue / dequeue O(1) with linked nodes",
  },
  "Binary tree": {
    kind: "Nonlinear · binary search tree",
    description:
      "Smaller keys branch left, larger keys branch right. The shape comes from your insertion order. Duplicate keys are ignored.",
    operations: ["Insert", "Search"],
    cost: "Search / insert O(h) · Worst case O(n)",
  },
  Graph: {
    kind: "Nonlinear · connections",
    description:
      "Breadth-first search uses a queue to visit reachable neighbors. Edit edges using zero-based node indices.",
    operations: ["Breadth-first search"],
    cost: "BFS O(V + E)",
  },
  "Hash table": {
    kind: "Associative · chained buckets",
    description:
      "A key maps to a bucket using positive modulo. Collisions form a chain within that bucket.",
    operations: ["Insert", "Remove", "Search"],
    cost: "Search / insert / remove O(1) average · O(n) worst",
  },
};
for (const [type, ops] of Object.entries(extraOperations))
  structureInfo[type].operations.push(...ops);
export function buildTree(values) {
  let root = null;
  for (const value of values) {
    if (!root) {
      root = { value, left: null, right: null };
      continue;
    }
    let n = root;
    while (n.value !== value) {
      const side = value < n.value ? "left" : "right";
      if (!n[side]) {
        n[side] = { value, left: null, right: null };
        break;
      }
      n = n[side];
    }
  }
  return root;
}
export function parseEdges(text, n) {
  if (!text.trim()) return [];
  return text.split(",").map((pair) => {
    const match = pair.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (!match) throw Error("Edges use indices such as 0-1, 1-2.");
    const a = +match[1],
      b = +match[2];
    if (a >= n || b >= n || a === b)
      throw Error(`Use distinct node indices from 0 to ${n - 1}.`);
    return [a, b];
  });
}
export function structureTrace(
  type,
  initial,
  {
    operation = structureInfo[type]?.operations[0],
    value,
    index = 0,
    target = 0,
    buckets = 4,
    edges = [],
  },
) {
  if (!structureInfo[type]?.operations.includes(operation))
    throw Error("Unsupported structure operation.");
  const extended = extendedTrace(
    type,
    initial,
    { operation, value, index, target, buckets, edges },
    buildTree,
  );
  if (extended) return extended;
  const events = [];
  let values = [...initial];
  const emit = (message, active = [], extra = {}) =>
    events.push({
      values: [...values],
      message,
      active: [...active],
      ...structuredClone(extra),
    });
  emit(`Start with ${values.length} value${values.length === 1 ? "" : "s"}.`);
  if (type === "Graph") {
    if (!values.length) {
      emit("This graph is empty. Add values to create vertices.", [], {
        queue: [],
        visited: [],
      });
      return events;
    }
    if (index < 0 || index >= values.length)
      throw Error("Choose a valid starting node index.");
    const adj = values.map(() => []);
    for (const [a, b] of edges) {
      adj[a].push(b);
      adj[b].push(a);
    }
    const seen = new Set([index]),
      queue = [index],
      visited = [];
    emit(`Enqueue node ${index} (${values[index]}).`, [index], {
      queue: [...queue],
      visited: [...visited],
    });
    while (queue.length) {
      const current = queue.shift();
      visited.push(current);
      emit(`Visit node ${current} (${values[current]}).`, [current], {
        queue: [...queue],
        visited: [...visited],
      });
      for (const next of adj[current])
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
          emit(`Discover node ${next}; add it to the queue.`, [current, next], {
            queue: [...queue],
            visited: [...visited],
          });
        }
    }
    emit(
      `Traversal complete. Reached ${visited.length} of ${values.length} nodes.`,
      [],
      { queue: [], visited },
    );
    return events;
  }
  if (type === "Binary tree") {
    let node = buildTree(values);
    while (node) {
      emit(`Compare ${value} with ${node.value}.`, [
        values.indexOf(node.value),
      ]);
      if (value === node.value) {
        emit(
          operation === "Insert"
            ? `${value} already exists; keep unique keys.`
            : `Found ${value}.`,
          [values.indexOf(node.value)],
        );
        return events;
      }
      const side = value < node.value ? "left" : "right";
      emit(
        `${value} is ${side === "left" ? "smaller" : "larger"}; follow the ${side} branch.`,
        [values.indexOf(node.value)],
      );
      node = node[side];
    }
    if (operation === "Insert") {
      values.push(value);
      emit(`Insert ${value} at the open position.`, [values.length - 1]);
    } else emit(`${value} is not in this tree.`);
    return events;
  }
  if (type === "Hash table") {
    const bucket = ((value % buckets) + buckets) % buckets;
    emit(
      `Hash ${value}: positive modulo ${buckets} gives bucket ${bucket}.`,
      [],
      { bucket },
    );
    const chain = values
      .map((v, i) => ({ v, i }))
      .filter((x) => ((x.v % buckets) + buckets) % buckets === bucket);
    for (const entry of chain) {
      emit(`Inspect ${entry.v} in bucket ${bucket}.`, [entry.i], { bucket });
      if (entry.v === value && operation !== "Insert") {
        if (operation === "Remove") {
          values.splice(entry.i, 1);
          emit(`Remove ${value} from the chain.`, [], { bucket });
        } else
          emit(`Found ${value} in bucket ${bucket}.`, [entry.i], { bucket });
        return events;
      }
    }
    if (operation === "Insert") {
      values.push(value);
      emit(
        `Append ${value} to bucket ${bucket}${chain.length ? " after the collision chain" : ""}.`,
        [values.length - 1],
        { bucket },
      );
    } else emit(`${value} was not found.`, [], { bucket });
    return events;
  }
  if (operation === "Search") {
    for (let i = 0; i < values.length; i++) {
      emit(`Compare position ${i}: ${values[i]} with ${value}.`, [i]);
      if (values[i] === value) {
        emit(`Found ${value} at position ${i}.`, [i]);
        return events;
      }
    }
    emit(`${value} is not present.`);
    return events;
  }
  if (operation === "Push" || operation === "Enqueue") {
    emit(`Prepare ${value} for the ${operation === "Push" ? "top" : "back"}.`);
    values.push(value);
    emit(`${value} is now at the ${operation === "Push" ? "top" : "back"}.`, [
      values.length - 1,
    ]);
    return events;
  }
  if (operation === "Pop" || operation === "Dequeue") {
    if (!values.length) {
      emit("The structure is empty; there is nothing to remove.");
      return events;
    }
    const i = operation === "Pop" ? values.length - 1 : 0;
    emit(
      `Remove ${values[i]} from the ${i === 0 && operation === "Dequeue" ? "front" : "top"}.`,
      [i],
    );
    values.splice(i, 1);
    emit(`${operation} complete. ${values.length} values remain.`);
    return events;
  }
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index > (operation === "Insert" ? values.length : values.length - 1)
  )
    throw Error("Position is outside this structure.");
  if (type === "Linked list") {
    for (let i = 0; i <= Math.min(index, values.length - 1); i++)
      emit(`Follow link to node ${i} (${values[i]}).`, [i]);
    if (operation === "Insert") {
      emit(
        `Create node ${value}; connect its next link to ${index < values.length ? values[index] : "null"}.`,
        [],
        { pending: value },
      );
      values.splice(index, 0, value);
      emit(
        `Reconnect ${index === 0 ? "head" : "the previous node"} to ${value}.`,
        [index],
      );
    } else {
      emit(
        `Bypass node ${values[index]}; reconnect to ${index + 1 < values.length ? values[index + 1] : "null"}.`,
        [index],
      );
      values.splice(index, 1);
      emit("The remaining links form the updated chain.");
    }
    return events;
  }
  if (operation === "Insert") {
    values.push(null);
    for (let i = values.length - 1; i > index; i--) {
      values[i] = values[i - 1];
      values[i - 1] = null;
      emit(`Shift position ${i - 1} to ${i} to open a slot.`, [i - 1, i]);
    }
    values[index] = value;
    emit(`Write ${value} at index ${index}.`, [index]);
  } else {
    emit(`Remove ${values[index]} at index ${index}.`, [index]);
    for (let i = index; i < values.length - 1; i++) {
      values[i] = values[i + 1];
      emit(`Shift position ${i + 1} back to ${i}.`, [i, i + 1]);
    }
    values.pop();
    emit("Close the gap. Removal is complete.");
  }
  return events;
}
