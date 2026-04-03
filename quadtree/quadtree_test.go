package quadtree

import (
	"math"
	"sort"
	"testing"
)

func TestBoundsFromPoints(t *testing.T) {
	b := BoundsFromPoints([]Point{{1, 1}, {3, 2}, {3, 5}}, 0.1)
	if b.MinX >= 1 || b.MaxX <= 3 || b.MinY >= 1 || b.MaxY <= 5 {
		t.Fatalf("expected padding around data, got %+v", b)
	}
}

func TestInsertAndQuery(t *testing.T) {
	pts := []Point{{10, 10}, {15, 12}, {20, 11}, {14, 14}, {11, 20}, {30, 30}}
	bounds := BoundsFromPoints(pts, 0.05)
	qt := New(bounds, 2)
	for _, p := range pts {
		if !qt.Insert(p) {
			t.Fatalf("insert failed for %+v", p)
		}
	}
	if qt.PointCount() != len(pts) {
		t.Fatalf("count %d want %d", qt.PointCount(), len(pts))
	}
	q := Rect{MinX: 9, MinY: 9, MaxX: 16, MaxY: 21}
	got := qt.QueryRange(q)
	want := []Point{{10, 10}, {15, 12}, {14, 14}, {11, 20}}
	sortByXY(got)
	sortByXY(want)
	if !pointsEqual(got, want) {
		t.Fatalf("query got %+v want %+v", got, want)
	}
}

func TestOverflowSplit(t *testing.T) {
	bounds := Rect{MinX: 0, MinY: 0, MaxX: 100, MaxY: 100}
	qt := New(bounds, 4)
	// Four corners + center forces multiple splits
	ins := []Point{{5, 5}, {95, 5}, {5, 95}, {95, 95}, {50, 50}}
	for _, p := range ins {
		if !qt.Insert(p) {
			t.Fatalf("insert %+v", p)
		}
	}
	if qt.Root.IsLeaf() {
		t.Fatal("expected split root")
	}
}

func TestRejectOutsideBounds(t *testing.T) {
	qt := New(Rect{0, 0, 10, 10}, 4)
	if qt.Insert(Point{20, 20}) {
		t.Fatal("expected reject")
	}
	if qt.PointCount() != 0 {
		t.Fatal("count")
	}
}

func TestDuplicateCoordinates(t *testing.T) {
	bounds := Rect{0, 0, 100, 100}
	qt := New(bounds, 1) // split often; at max depth buckets grow
	p := Point{50, 50}
	for i := 0; i < 50; i++ {
		if !qt.Insert(p) {
			t.Fatalf("insert %d failed", i)
		}
	}
	if qt.PointCount() != 50 {
		t.Fatalf("count %d", qt.PointCount())
	}
}

func TestQueryEmpty(t *testing.T) {
	qt := New(Rect{0, 0, 100, 100}, 4)
	if len(qt.QueryRange(Rect{0, 0, 1, 1})) != 0 {
		t.Fatal("expected empty")
	}
}

func sortByXY(ps []Point) {
	sort.Slice(ps, func(i, j int) bool {
		if ps[i].X != ps[j].X {
			return ps[i].X < ps[j].X
		}
		return ps[i].Y < ps[j].Y
	})
}

func pointsEqual(a, b []Point) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if math.Abs(a[i].X-b[i].X) > 1e-6 || math.Abs(a[i].Y-b[i].Y) > 1e-6 {
			return false
		}
	}
	return true
}
