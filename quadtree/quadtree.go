package quadtree

import (
	"math"
)

// Point is a 2D coordinate.
type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// Rect is an axis-aligned rectangle [MinX, MaxX) × [MinY, MaxY) for containment tests,
// using the same quadrant split as SVG (Y increases downward: smaller Y is “north”).
type Rect struct {
	MinX float64 `json:"minX"`
	MinY float64 `json:"minY"`
	MaxX float64 `json:"maxX"`
	MaxY float64 `json:"maxY"`
}

// Contains reports whether p lies inside the rectangle, including edges.
func (r Rect) Contains(p Point) bool {
	return p.X >= r.MinX && p.X <= r.MaxX && p.Y >= r.MinY && p.Y <= r.MaxY
}

// Intersects reports whether r overlaps other (closed rectangles).
func (r Rect) Intersects(other Rect) bool {
	return !(other.MaxX < r.MinX || other.MinX > r.MaxX || other.MaxY < r.MinY || other.MinY > r.MaxY)
}

// Node is one PR quadtree cell (internal or leaf).
type Node struct {
	Bounds   Rect
	Depth    int
	Points   []Point // only for leaves with no children
	NW       *Node
	NE       *Node
	SW       *Node
	SE       *Node
}

// IsLeaf reports whether n holds points directly.
func (n *Node) IsLeaf() bool {
	return n.NW == nil && n.NE == nil && n.SW == nil && n.SE == nil
}

// Quadtree is a point quadtree with bucket capacity per leaf.
type Quadtree struct {
	Bounds     Rect
	Capacity   int
	MaxDepth   int // if Depth >= MaxDepth at a leaf, new points are stored without splitting
	Root       *Node
	pointCount int
}

const (
	defaultMaxDepth = 32
	epsilon         = 1e-9
)

// New builds an empty quadtree for the given world bounds.
// capacity must be >= 1.
func New(bounds Rect, capacity int) *Quadtree {
	if capacity < 1 {
		capacity = 1
	}
	bounds = normalizeBounds(bounds)
	return &Quadtree{
		Bounds:   bounds,
		Capacity: capacity,
		MaxDepth: defaultMaxDepth,
		Root: &Node{
			Bounds: bounds,
			Depth:  0,
			Points: nil,
		},
	}
}

func normalizeBounds(r Rect) Rect {
	dx := r.MaxX - r.MinX
	dy := r.MaxY - r.MinY
	if dx < epsilon {
		mid := (r.MinX + r.MaxX) * 0.5
		r.MinX = mid - epsilon
		r.MaxX = mid + epsilon
	}
	if dy < epsilon {
		mid := (r.MinY + r.MaxY) * 0.5
		r.MinY = mid - epsilon
		r.MaxY = mid + epsilon
	}
	return r
}

// BoundsFromPoints computes a padded axis-aligned rectangle containing all points (two-pass helper).
func BoundsFromPoints(points []Point, padFraction float64) Rect {
	if len(points) == 0 {
		return Rect{MinX: 0, MinY: 0, MaxX: 1, MaxY: 1}
	}
	minX, minY := points[0].X, points[0].Y
	maxX, maxY := minX, minY
	for _, p := range points[1:] {
		minX = math.Min(minX, p.X)
		minY = math.Min(minY, p.Y)
		maxX = math.Max(maxX, p.X)
		maxY = math.Max(maxY, p.Y)
	}
	if padFraction < 0 {
		padFraction = 0
	}
	w := maxX - minX
	h := maxY - minY
	if w < epsilon {
		w = epsilon
	}
	if h < epsilon {
		h = epsilon
	}
	padx := w * padFraction
	pady := h * padFraction
	return normalizeBounds(Rect{
		MinX: minX - padx,
		MinY: minY - pady,
		MaxX: maxX + padx,
		MaxY: maxY + pady,
	})
}

// Insert adds p if it lies within the tree bounds. Returns false if outside.
func (t *Quadtree) Insert(p Point) bool {
	if !t.Bounds.Contains(p) {
		return false
	}
	if t.insertInto(t.Root, p) {
		t.pointCount++
		return true
	}
	return false
}

func (t *Quadtree) insertInto(n *Node, p Point) bool {
	if !n.Bounds.Contains(p) {
		return false
	}
	if n.IsLeaf() {
		if len(n.Points) < t.Capacity || n.Depth >= t.MaxDepth {
			n.Points = append(n.Points, p)
			return true
		}
		pts := append(n.Points, p)
		n.Points = nil
		t.subdivide(n)
		for _, q := range pts {
			child := t.childForPoint(n, q)
			if child == nil {
				n.Points = append(n.Points, q)
				continue
			}
			_ = t.insertInto(child, q)
		}
		return true
	}
	child := t.childForPoint(n, p)
	if child == nil {
		return false
	}
	return t.insertInto(child, p)
}

func (t *Quadtree) subdivide(n *Node) {
	b := n.Bounds
	midX := (b.MinX + b.MaxX) * 0.5
	midY := (b.MinY + b.MaxY) * 0.5
	depth := n.Depth + 1
	n.NW = &Node{Bounds: Rect{MinX: b.MinX, MinY: b.MinY, MaxX: midX, MaxY: midY}, Depth: depth}
	n.NE = &Node{Bounds: Rect{MinX: midX, MinY: b.MinY, MaxX: b.MaxX, MaxY: midY}, Depth: depth}
	n.SW = &Node{Bounds: Rect{MinX: b.MinX, MinY: midY, MaxX: midX, MaxY: b.MaxY}, Depth: depth}
	n.SE = &Node{Bounds: Rect{MinX: midX, MinY: midY, MaxX: b.MaxX, MaxY: b.MaxY}, Depth: depth}
}

// childForPoint returns the child quadrant containing p, or nil if p is on a split line
// ambiguous case — caller should handle by keeping point in parent (rare with floats).
func (t *Quadtree) childForPoint(n *Node, p Point) *Node {
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

// QueryRange returns all points inside query (not necessarily unique if duplicates stored).
func (t *Quadtree) QueryRange(query Rect) []Point {
	if t.Root == nil || !t.Bounds.Intersects(query) {
		return nil
	}
	var out []Point
	t.queryNode(t.Root, query, &out)
	return out
}

func (t *Quadtree) queryNode(n *Node, query Rect, out *[]Point) {
	if n == nil || !n.Bounds.Intersects(query) {
		return
	}
	if n.IsLeaf() {
		for _, p := range n.Points {
			if query.Contains(p) {
				*out = append(*out, p)
			}
		}
		return
	}
	t.queryNode(n.NW, query, out)
	t.queryNode(n.NE, query, out)
	t.queryNode(n.SW, query, out)
	t.queryNode(n.SE, query, out)
}

// PointCount returns how many inserts succeeded.
func (t *Quadtree) PointCount() int {
	return t.pointCount
}
