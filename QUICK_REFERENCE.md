# Quick Reference

_Layered for recall. **Top = glance** · **Middle = explanation** · **Bottom = internals & gotchas.** Try to recall before scrolling down._

---

## 1. Quick Recall

### Python Syntax

<a id="qr-py-lists-strings"></a>
#### Lists & strings
- **`lst[-1]`** — last element (-2 = 2nd-to-last, etc.)
- **`lst[1:-1]`** — slicing; returns a **copy**. Start inclusive, stop exclusive. [details](#d-slicing) · [ex](#ex-slicing) · [bts](#bts-slicing)
- **`lst.insert(0, x)`** — O(n) (shifts everything).
- **`"".join(lst)`** — concatenate strings; O(n). Call on separator. [details](#d-join)
- **Strings are immutable** — `+=` in loop = O(n²). Use `join`. [bts](#bts-string-immut)

<a id="qr-py-iteration"></a>
#### Iteration
- **`enumerate(lst)`** — `for i, item in enumerate(lst)`. Prefer over `range(len(...))`.
- **`range(start, stop, step)`** — start inclusive, stop exclusive. Reverse: `range(len(s)-1, -1, -1)`. [details](#d-range) · [bts](#bts-range)

<a id="qr-py-numbers"></a>
#### Numbers
- **`//`** — floor division, floors toward -∞. [details](#d-floor-division) · [ex](#ex-floor-division) · [bts](#bts-floor-division)

<a id="qr-py-identity"></a>
#### Identity comparison
- **`is None` / `is not None`** — never `==` / `!= None`. [details](#d-is-none)

<a id="qr-py-truthy"></a>
#### Truthiness
- **Falsy:** `False`, `None`, `0`, `0.0`, `''`, `[]`, `{}`, `set()`, `()`. Everything else is truthy (empty container = falsy, non-empty = truthy).
- **`not x`** = idiomatic "is it empty?" — e.g. `return not lst`. Caveat: lumps `0`/`None`/empty together, so use `== 0` or `is None` when `0` is a valid value.

<a id="qr-py-switch"></a>
#### Switch
- **`match` / `case`** (3.10+) — Python's switch. Share a branch with the or-pattern: `case '(' | '[' | '{':`. For a single value it's just an if/elif (`if ch in '([{':` is more common).

<a id="qr-py-dict"></a>
#### Dict
- **Basics** — `d = {}`, `d[k] = v`, `if k in d`. Lookup O(1).
- **`del d[k]`** — remove (KeyError if missing).
- **`d.pop(k, default)`** — remove + return; safer than `del`.
- **`d.get(k, default)`** — safe lookup. Counting idiom: `d[k] = d.get(k, 0) + 1`. [ex](#ex-counter)

<a id="qr-py-set"></a>
#### Set
- **Basics** — `s.add(x)` (not `.append`), `x in s` is O(1).
- **`set(lst)`** — dedup. `len(set(x)) != len(x)` → has duplicates.
- **Set ops** — operations between two sets:

    | Op  | Meaning              | Example                          |
    |-----|----------------------|----------------------------------|
    | `&` | intersection (∩)     | `{1,2,3} & {2,3,4}` → `{2,3}`    |
    | `\|`| union (∪)            | `{1,2} \| {2,3}` → `{1,2,3}`     |
    | `-` | difference           | `{1,2,3} - {2}` → `{1,3}`        |
    | `^` | symmetric difference | `{1,2,3} ^ {2,3,4}` → `{1,4}`    |

<a id="qr-ll"></a>
### Linked Lists
- **`ListNode`** — `val`, `next`. [details](#d-listnode) · [ex](#ex-listnode)
- **Traversal:** `while current is not None`. [details](#d-ll-traverse) · [ex](#ex-ll-traverse) · [bts](#bts-ll-traverse)
- **Reverse:** 3-pointer (prev / curr / next_node). [details](#d-ll-reverse) · [ex](#ex-ll-reverse) · [bts](#bts-ll-reverse)
- **Remove a node:** walk to predecessor, then `prev.next = target.next`. [bts](#bts-ll-remove)

<a id="qr-stacks-queues"></a>
### Stacks & Queues
- **Stack = LIFO** — use a **list**: `append` (push), `pop()` (pop top), `[-1]` (peek), `not lst` (is_empty). All O(1) (the end of an array needs no shifting).
- **Queue = FIFO** — use **`collections.deque`**: `append` (enqueue), `popleft()` (dequeue front), `[0]` (peek). O(1) at both ends.
- **Don't** use a list as a queue — `pop(0)` shifts every element → O(n) (O(n²) to drain).
- **Trigger:** nesting / matching / undo → stack; arrival-order / level-by-level / BFS → queue.
- **`valid_parentheses`** — push openers; on a closer fail if stack empty OR top ≠ match; valid iff stack empty at end.
- **Writing a class** — `__init__(self)` sets up state; every method takes `self` first; reach state via `self._items`.

<a id="qr-hash"></a>
### Hash Maps & Sets
- **`dict`/`set`** both built on hash tables. Average O(1) ops. [bts](#bts-hash)
- **Dict vs set:** need a value/index → dict. Just membership → set.
- **Dict keys must be hashable** (immutable). [bts](#bts-hash-keys)
- **Dict values can be containers** — used for grouping. [ex](#ex-grouping)

<a id="qr-patterns"></a>
### Patterns
- **Two Sum** — store `val → index`; check `target - x` in dict. [ex](#ex-two-sum)
- **Contains Duplicate** — `len(set(x)) != len(x)`.
- **Count-then-scan** — pass 1 builds counts; pass 2 finds first/best/etc. [ex](#ex-first-unique)
- **Grouping with `setdefault(k, []).append(v)`** — or `defaultdict(list)`. [ex](#ex-grouping)

<a id="qr-bigo"></a>
### Big O
- **Recognize:** O(1) → O(log n) → O(n) → O(n log n) → O(n²) → O(2ⁿ) → O(n!). [details](#d-bigo)
- **Rules:** drop constants, drop smaller terms, default = worst case.
- **Recursion counts** — each call is work + stack space.
- **Two inputs → O(n + m)**, don't collapse.
- **Amortized O(1)** — occasional resize doesn't change average. [bts](#bts-amortized)

<a id="qr-habits"></a>
### Habits (interview-style)
- State **brute force + complexity** before optimizing.
- **Dry-run on paper** before running tests.
- **Trace booleans with one example** before submitting.
- **Draw diagrams** for pointer problems.

<a id="qr-gotchas"></a>
### Gotchas
- Never modify a list while iterating. [bts](#bts-iter-modify)
- `lst[1:-1]` is a copy, not a view. [bts](#bts-slicing)
- Delete-as-you-go breaks with odd counts. [bts](#bts-delete-as-you-go)

---

## 2. Details

<a id="d-floor-division"></a>
### `//` floor division
Returns the **largest integer ≤ the true quotient**. Equivalent: "the integer to the LEFT on the number line." For positives this matches truncation; for negatives it does NOT — `-7 // 2 = -4`, not -3.

_↑ [Numbers](#qr-py-numbers)_

<a id="d-slicing"></a>
### Slicing `lst[a:b]`
**Start inclusive, stop exclusive** — same rule as `range`. So `lst[1:-1]` keeps everything from index 1 up to (but not including) index -1 → strips the first AND last element. The `-1` here uses the **indexing** meaning (last element), not the `range`-arg meaning (the integer below 0).

_↑ [Lists & strings](#qr-py-lists-strings)_

<a id="d-join"></a>
### `"".join(lst)`
Builds a string in one pass — O(n) total. Avoids the O(n²) trap of repeated string concatenation. Separator goes on the left.

_↑ [Lists & strings](#qr-py-lists-strings)_

<a id="d-range"></a>
### `range(start, stop, step)`
Lazy integer sequence. `start` inclusive, `stop` exclusive — **in both directions**. For reverse traversal of indices: `range(len(s) - 1, -1, -1)`. The `-1` here is just the integer below 0; it has nothing to do with negative-index list lookup.

_↑ [Iteration](#qr-py-iteration)_

<a id="d-is-none"></a>
### `is None` vs `== None`
`is` checks **identity** (same object). `==` calls `__eq__`, which custom classes (e.g. numpy arrays) can override unpredictably. None is a singleton, so identity is exactly what you want. PEP 8 mandates it; linters enforce it.

_↑ [Identity comparison](#qr-py-identity)_

<a id="d-listnode"></a>
### `ListNode`
Minimal class with `val` and `next`. The `next` field points to another `ListNode` (or `None` at the tail). A "linked list" is just a head pointer to the first node — there's no separate list object. See [ex](#ex-listnode) for the class definition.

_↑ [Linked Lists](#qr-ll)_

<a id="d-ll-traverse"></a>
### Linked list traversal
Loop on `current`, NOT `current.next`. The first form processes every node and handles an empty list (`head = None`) cleanly. The alternative crashes on empty and skips the last node. See [ex](#ex-ll-traverse) for the skeleton, [bts](#bts-ll-traverse) for what breaks.

_↑ [Linked Lists](#qr-ll)_

<a id="d-ll-reverse"></a>
### 3-pointer reverse
You need three references because `curr.next = prev` overwrites the forward link — so save it first (`next_node`). And singly linked lists have no back pointer, so `prev` must be tracked manually. Return `prev` (the old tail) as the new head.

_↑ [Linked Lists](#qr-ll)_

<a id="d-bigo"></a>
### Big O quick map

| Big O | Example |
|-------|---------|
| O(1) | Hash lookup, index access |
| O(log n) | Binary search |
| O(n) | Single loop |
| O(n log n) | Merge sort |
| O(n²) | Nested loops |
| O(2ⁿ) | Recursive subsets |
| O(n!) | Permutations |

_↑ [Big O](#qr-bigo)_

---

## 3. Examples

<a id="ex-slicing"></a>
### Slicing
```python
lst = [10, 20, 30, 40, 50]
lst[1:-1]    # → [20, 30, 40]   (drops first AND last)
lst[:3]      # → [10, 20, 30]   (first three)
lst[2:]      # → [30, 40, 50]   (from index 2 onward)
lst[:]       # → full copy
```

_↑ [Lists & strings](#qr-py-lists-strings)_

<a id="ex-listnode"></a>
### `ListNode` class
```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```

_↑ [Linked Lists](#qr-ll)_

<a id="ex-floor-division"></a>
### Floor division
```python
7 // 2       # 3
-7 // 2      # -4   ← NOT -3
-7 / 2       # -3.5
```

_↑ [Numbers](#qr-py-numbers)_

<a id="ex-counter"></a>
### Counter idiom
```python
counts = {}
for c in "hello":
    counts[c] = counts.get(c, 0) + 1
# {'h': 1, 'e': 1, 'l': 2, 'o': 1}
```

_↑ [Dict](#qr-py-dict)_

<a id="ex-ll-traverse"></a>
### Linked list traversal
```python
current = head
while current is not None:
    # do work
    current = current.next
```

_↑ [Linked Lists](#qr-ll)_

<a id="ex-ll-reverse"></a>
### Canonical reverse
```python
def reverse_list(head):
    prev = None
    curr = head
    while curr is not None:
        next_node = curr.next   # save before overwriting
        curr.next = prev        # flip the link
        prev = curr
        curr = next_node
    return prev   # new head = old tail
```

_↑ [Linked Lists](#qr-ll)_

<a id="ex-two-sum"></a>
### Two Sum
```python
def two_sum(nums, target):
    seen = {}   # val → index
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
```

_↑ [Patterns](#qr-patterns)_

<a id="ex-first-unique"></a>
### First unique character (count-then-scan)
```python
def first_unique(s):
    counts = {}
    for c in s:
        counts[c] = counts.get(c, 0) + 1
    for i, c in enumerate(s):
        if counts[c] == 1:
            return i
    return -1
```

_↑ [Patterns](#qr-patterns)_

<a id="ex-grouping"></a>
### Grouping (anagram-style)
```python
groups = {}
for word in words:
    key = "".join(sorted(word))
    groups.setdefault(key, []).append(word)
# {"aet": ["eat","tea","ate"], "ant": ["tan","nat"], ...}
```

_↑ [Patterns](#qr-patterns)_

---

## 4. Behind the Scenes

<a id="bts-floor-division"></a>
### `//` floor division
- "Floors toward -∞", not "rounds toward zero." Truncation behaves differently from floor for negatives.
- Floor result + remainder always satisfies `a == (a // b) * b + (a % b)`.
- Python's `%` follows floor division, so `-7 % 2 == 1` (not -1 as in C).

_↑ [Numbers](#qr-py-numbers)_

<a id="bts-slicing"></a>
### Slicing copies
- `lst[a:b]` allocates a new list — O(b-a) time and space.
- For huge lists this is a hidden cost. Use indices or iterators instead when possible.
- `lst[:]` is the idiomatic full-copy.

_↑ [Lists & strings](#qr-py-lists-strings)_

<a id="bts-string-immut"></a>
### String immutability
- Every `s += x` builds a new string of length `len(s) + len(x)` and copies the old contents.
- Across a loop of n appends, that's `1 + 2 + ... + n = O(n²)`.
- Workaround: collect parts into a list, `"".join()` at the end → O(n) total.

_↑ [Lists & strings](#qr-py-lists-strings)_

<a id="bts-range"></a>
### `range()`
- A `range` object is **lazy** — it stores `start`, `stop`, `step` and computes values on demand. `range(10**9)` allocates almost nothing.
- Supports indexing, slicing, `len()`, `in` — but it's not a list. `list(range(...))` materializes it.

_↑ [Iteration](#qr-py-iteration)_

<a id="bts-ll-traverse"></a>
### What breaks with `while current.next is not None`
- **Empty list** (`head = None`): the check `None.next` raises `AttributeError`.
- **Three-node list `1 → 2 → 3`**: when `current = node3`, `current.next is None` → loop exits **without processing node 3**. Last node is skipped.

_↑ [Linked Lists](#qr-ll)_

<a id="bts-ll-reverse"></a>
### 3-pointer reverse — what each pointer is for
- `prev` — the node that should come after `curr` in the reversed list. No back pointer in a singly linked list, so we must remember it.
- `curr` — the node being processed this iteration.
- `next_node` — saved BEFORE `curr.next = prev` overwrites it. Without it, the rest of the list is unreachable.

_↑ [Linked Lists](#qr-ll)_

<a id="bts-ll-remove"></a>
### Linked list removal — edge cases
- **target is head** → no predecessor; update head, caller must receive new head.
- **target is tail** → general case handles it (`target.next is None` becomes the new tail's `.next`).
- **target not in list** → naive loop walks off the end (`None.next` crashes); guard with `while curr is not None`.

_↑ [Linked Lists](#qr-ll)_

<a id="bts-hash"></a>
### Hash table internals
- Contiguous array of slots. Hash function maps key → slot index.
- **Collisions** handled by **probing** (CPython uses open addressing) — walk to the next empty slot.
- **Resize at ~2/3 load** — allocate larger array, rehash everything. Rare → averaged out.
- Lookup is O(1) average because hashing jumps directly to the slot, no scanning.

_↑ [Hash Maps & Sets](#qr-hash)_

<a id="bts-hash-keys"></a>
### Hashable keys
- Must be **immutable** so hash value stays stable: strings, ints, tuples work. Lists, sets, dicts do not.
- Custom classes are hashable by default (identity-based) unless you override `__eq__` without `__hash__`.

_↑ [Hash Maps & Sets](#qr-hash)_

<a id="bts-amortized"></a>
### Amortized O(1)
- A single resize is O(n), but it happens only after n inserts.
- Spread that O(n) cost across n inserts → O(1) per insert on average.
- "Amortized" = averaged over a sequence of operations, not per-operation guarantee.

_↑ [Hash Maps & Sets](#qr-hash)_

<a id="bts-iter-modify"></a>
### Modifying while iterating
- Python's iterators hold an index/pointer into the underlying structure. Mutating shifts elements and confuses the index.
- Symptoms: skipped items, `RuntimeError: dictionary changed size during iteration`, off-by-one bugs.
- Fixes: iterate a copy (`for x in lst[:]`), or build a new list, or collect indices first and remove after.

_↑ [Gotchas](#qr-gotchas)_

<a id="bts-delete-as-you-go"></a>
### Delete-as-you-go gotcha
- Pattern: walk a list, remove matched items as you find pairs (e.g. for "find unpaired element").
- Breaks when an element occurs an odd number of times — one copy survives and skews later matches.
- Safer: count first (`d[k] = d.get(k, 0) + 1`), then scan for the count condition you actually want.

_↑ [Gotchas](#qr-gotchas)_
