// Command tracegen prints a JSON search trace for the bundled example skip list (fixed seed).
// Usage: go run ./cmd/tracegen > web/public/fixtures/example-skiplist-search.json
package main

import (
	"encoding/json"
	"fmt"
	"os"

	"golang-ds/skiplist"
)

func main() {
	const seed int64 = 42
	sl := skiplist.NewForTest[int](seed)
	for _, v := range []int{5, 10, 20, 15} {
		sl.Insert(v)
	}

	tr := sl.SearchTrace(15)
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(tr); err != nil {
		fmt.Fprintf(os.Stderr, "encode: %v\n", err)
		os.Exit(1)
	}
}
