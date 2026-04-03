// Command quadtreetracegen prints a JSON insert trace for a bundled example (fixed point set).
// Usage: go run ./cmd/quadtreetracegen > web/public/fixtures/example-quadtree-insert.json
package main

import (
	"encoding/json"
	"fmt"
	"os"

	"golang-ds/quadtree"
)

func main() {
	const capacity = 4
	const pad = 0.05
	points := []quadtree.Point{
		{10, 15}, {45, 20}, {30, 60}, {70, 55}, {25, 40}, {50, 10}, {80, 80},
		{15, 70}, {60, 35}, {40, 85}, {20, 25}, {55, 65}, {75, 30}, {35, 50},
		{90, 40}, {5, 50},
		{12, 45}, {88, 18}, {42, 72}, {68, 12}, {33, 28}, {52, 58}, {8, 88}, {72, 88},
		{28, 8}, {62, 48}, {18, 62}, {95, 72}, {48, 95}, {38, 18}, {58, 22}, {22, 38},
		{85, 55}, {7, 22}, {92, 28}, {44, 44}, {66, 70}, {14, 8}, {78, 42}, {32, 78},
		{54, 35}, {24, 52}, {64, 25}, {46, 62}, {8, 35}, {86, 92}, {50, 75}, {36, 55},
	}
	tr := quadtree.BuildInsertTrace(points, capacity, pad)
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(tr); err != nil {
		fmt.Fprintf(os.Stderr, "encode: %v\n", err)
		os.Exit(1)
	}
}
