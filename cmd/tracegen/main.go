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
	// Longer insert sequence (unique keys) so towers / list height are visually richer.
	values := []int{
		3, 1, 10, 5, 20, 15, 8, 25, 30, 12, 35, 18, 40, 22, 45, 50,
		28, 55, 38, 60, 42, 48, 65, 52, 70, 58, 75,
		2, 4, 7, 9, 11, 13, 16, 19, 21, 23, 26, 27, 29, 31, 32, 34,
		36, 39, 41, 43, 46, 49, 51, 53, 56, 57, 59, 61, 62, 63, 64,
		66, 67, 69, 71, 73, 74, 76, 77, 79, 80, 81, 82, 83, 84, 86,
		87, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100,
	}
	for _, v := range values {
		sl.Insert(v)
	}

	tr := sl.SearchTrace(48)
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(tr); err != nil {
		fmt.Fprintf(os.Stderr, "encode: %v\n", err)
		os.Exit(1)
	}
}
