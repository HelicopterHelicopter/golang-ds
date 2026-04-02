# Golang Data Structures

This repository contains implementations of various data structures in Go (Golang). The implementations strive to be generic, thread-safe, and idiomatic.

## Available Data Structures

### Skip List
A generic, thread-safe skip list implementation. A skip list is a probabilistic data structure that allows for fast search, insertion, and deletion operations. It is built upon a sorted linked list with multiple levels of indexes, providing expected `O(log N)` time complexity for these operations.

#### Features
- **Generic:** Works with any type that satisfies `cmp.Ordered` (e.g., `int`, `string`, `float64`).
- **Thread-safe:** Uses `sync.RWMutex` to allow concurrent reads while ensuring exclusive access during writes.

#### Usage
```go
package main

import (
	"fmt"
	"golang-ds/skiplist"
)

func main() {
	// Create a new Skip List for integers
	sl := skiplist.New[int]()

	// Insert elements
	sl.Insert(10)
	sl.Insert(20)
	sl.Insert(5)

	// Search for elements
	fmt.Println("Contains 10:", sl.Search(10)) // Output: true
	fmt.Println("Contains 15:", sl.Search(15)) // Output: false
}
```

## Testing

To run the tests for all data structures, including the race detector to ensure thread safety, use the following command (scoped to Go packages so `web/node_modules` is not scanned):

```bash
go test -v -race ./skiplist/... ./cmd/...
```

## Visualizations

The `web/` directory is a static Vite + React app that steps through JSON **traces** (for example skip list search). Regenerate the sample fixture after changing trace output:

```bash
go run ./cmd/tracegen > web/public/fixtures/example-skiplist-search.json
cd web && npm install && npm run dev
```
