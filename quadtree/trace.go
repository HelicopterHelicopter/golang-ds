package quadtree

import (
	"fmt"
)

// Trace schema (matches web/src/types/trace discriminant).
const (
	TraceSchemaVersion = 1
	TraceKindInsert    = "quadtree-insert"
)

// QuadtreeInsertMeta is summary data for the trace player UI.
type QuadtreeInsertMeta struct {
	Capacity   int   `json:"capacity"`
	PointCount int   `json:"pointCount"`
	Bounds     Rect  `json:"bounds"`
	MaxDepth   int   `json:"maxDepth"` // configured max depth on the tree builder
}

// QuadtreeGraphNode is one cell in a flattened snapshot.
type QuadtreeGraphNode struct {
	ID       string  `json:"id"`
	ParentID string  `json:"parentId"`
	MinX     float64 `json:"minX"`
	MinY     float64 `json:"minY"`
	MaxX     float64 `json:"maxX"`
	MaxY     float64 `json:"maxY"`
	Depth    int     `json:"depth"`
	ChildNW  string  `json:"childNW"`
	ChildNE  string  `json:"childNE"`
	ChildSW  string  `json:"childSW"`
	ChildSE  string  `json:"childSE"`
}

// QuadtreeGraphPoint is one inserted point referencing its leaf cell id.
type QuadtreeGraphPoint struct {
	ID     string  `json:"id"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	LeafID string  `json:"leafId"`
}

// QuadtreeGraphSnapshot is the full tree state after an insertion step.
type QuadtreeGraphSnapshot struct {
	Bounds Rect                 `json:"bounds"`
	Nodes  []QuadtreeGraphNode `json:"nodes"`
	Points []QuadtreeGraphPoint `json:"points"`
}

// QuadtreeInsertPhase describes the step (single phase for now).
type QuadtreeInsertPhase string

const (
	PhaseAfterInsert QuadtreeInsertPhase = "after_insert"
)

// QuadtreeInsertStep is one animation frame after inserting one point.
type QuadtreeInsertStep struct {
	Phase       QuadtreeInsertPhase `json:"phase"`
	InsertIndex int                  `json:"insertIndex"`
	LastPointID string               `json:"lastPointId"`
	Graph       QuadtreeGraphSnapshot `json:"graph"`
}

// QuadtreeInsertTrace is the JSON envelope for quadtree insert visualization.
type QuadtreeInsertTrace struct {
	SchemaVersion int                  `json:"schemaVersion"`
	Kind          string               `json:"kind"`
	Meta          QuadtreeInsertMeta   `json:"meta"`
	Steps         []QuadtreeInsertStep `json:"steps"`
}

// BuildInsertTrace inserts points in order into a tree with bounds derived from
// all points (padding fraction), emitting one step per successful insert.
func BuildInsertTrace(points []Point, capacity int, padFraction float64) *QuadtreeInsertTrace {
	if len(points) == 0 {
		b := BoundsFromPoints(nil, padFraction)
		return &QuadtreeInsertTrace{
			SchemaVersion: TraceSchemaVersion,
			Kind:          TraceKindInsert,
			Meta: QuadtreeInsertMeta{
				Capacity:   capacity,
				PointCount: 0,
				Bounds:     b,
				MaxDepth:   defaultMaxDepth,
			},
			Steps: []QuadtreeInsertStep{},
		}
	}
	bounds := BoundsFromPoints(points, padFraction)
	steps := make([]QuadtreeInsertStep, 0, len(points))
	for i := range points {
		qt := New(bounds, capacity)
		for j := 0; j <= i; j++ {
			_ = qt.Insert(points[j])
		}
		g := snapshotInsertTrace(qt, points[:i+1])
		steps = append(steps, QuadtreeInsertStep{
			Phase:       PhaseAfterInsert,
			InsertIndex: i,
			LastPointID: fmt.Sprintf("p%d", i),
			Graph:       g,
		})
	}
	return &QuadtreeInsertTrace{
		SchemaVersion: TraceSchemaVersion,
		Kind:          TraceKindInsert,
		Meta: QuadtreeInsertMeta{
			Capacity:   capacity,
			PointCount: len(points),
			Bounds:     bounds,
			MaxDepth:   defaultMaxDepth,
		},
		Steps: steps,
	}
}

func snapshotInsertTrace(qt *Quadtree, inserted []Point) QuadtreeGraphSnapshot {
	idFor := make(map[*Node]string)
	next := 0
	var assignIDs func(*Node)
	assignIDs = func(n *Node) {
		if n == nil {
			return
		}
		idFor[n] = fmt.Sprintf("c%d", next)
		next++
		assignIDs(n.NW)
		assignIDs(n.NE)
		assignIDs(n.SW)
		assignIDs(n.SE)
	}
	assignIDs(qt.Root)

	nodes := make([]QuadtreeGraphNode, 0, next)
	var build func(*Node, string)
	build = func(n *Node, parentID string) {
		if n == nil {
			return
		}
		gn := QuadtreeGraphNode{
			ID:       idFor[n],
			ParentID: parentID,
			MinX:     n.Bounds.MinX,
			MinY:     n.Bounds.MinY,
			MaxX:     n.Bounds.MaxX,
			MaxY:     n.Bounds.MaxY,
			Depth:    n.Depth,
		}
		if n.NW != nil {
			gn.ChildNW = idFor[n.NW]
		}
		if n.NE != nil {
			gn.ChildNE = idFor[n.NE]
		}
		if n.SW != nil {
			gn.ChildSW = idFor[n.SW]
		}
		if n.SE != nil {
			gn.ChildSE = idFor[n.SE]
		}
		nodes = append(nodes, gn)
		myID := idFor[n]
		build(n.NW, myID)
		build(n.NE, myID)
		build(n.SW, myID)
		build(n.SE, myID)
	}
	build(qt.Root, "")

	pointsOut := make([]QuadtreeGraphPoint, len(inserted))
	for i, p := range inserted {
		leaf := findLeaf(qt.Root, p)
		leafID := ""
		if leaf != nil {
			leafID = idFor[leaf]
		}
		pointsOut[i] = QuadtreeGraphPoint{
			ID:     fmt.Sprintf("p%d", i),
			X:      p.X,
			Y:      p.Y,
			LeafID: leafID,
		}
	}
	return QuadtreeGraphSnapshot{
		Bounds: qt.Bounds,
		Nodes:  nodes,
		Points: pointsOut,
	}
}

func findLeaf(root *Node, p Point) *Node {
	n := root
	for n != nil && !n.IsLeaf() {
		ch := childForPointStatic(n, p)
		if ch == nil {
			return n
		}
		n = ch
	}
	return n
}

func childForPointStatic(n *Node, p Point) *Node {
	b := n.Bounds
	midX := (b.MinX + b.MaxX) * 0.5
	midY := (b.MinY + b.MaxY) * 0.5
	left := p.X < midX
	top := p.Y < midY
	if top {
		if left {
			return n.NW
		}
		return n.NE
	}
	if left {
		return n.SW
	}
	return n.SE
}
