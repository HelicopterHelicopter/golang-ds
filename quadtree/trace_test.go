package quadtree

import "testing"

func TestBuildInsertTraceSteps(t *testing.T) {
	pts := []Point{{0, 0}, {100, 100}, {50, 50}, {10, 90}}
	tr := BuildInsertTrace(pts, 2, 0.05)
	if len(tr.Steps) != len(pts) {
		t.Fatalf("steps %d want %d", len(tr.Steps), len(pts))
	}
	for i, s := range tr.Steps {
		if s.InsertIndex != i {
			t.Fatalf("step %d insertIndex %d", i, s.InsertIndex)
		}
		if len(s.Graph.Points) != i+1 {
			t.Fatalf("step %d points %d want %d", i, len(s.Graph.Points), i+1)
		}
	}
}

func TestBuildInsertTraceEmpty(t *testing.T) {
	tr := BuildInsertTrace(nil, 4, 0.05)
	if tr.Steps == nil {
		t.Fatal("want non-nil empty slice")
	}
	if len(tr.Steps) != 0 {
		t.Fatalf("steps %d", len(tr.Steps))
	}
}
