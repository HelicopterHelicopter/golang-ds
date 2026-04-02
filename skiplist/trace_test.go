package skiplist

import (
	"fmt"
	"testing"
)

func TestSearchTrace_MatchesSearch(t *testing.T) {
	sl := NewForTest[int](42)
	for _, v := range []int{5, 10, 20, 15} {
		sl.Insert(v)
	}

	for _, target := range []int{5, 10, 15, 20, 7, 100} {
		want := sl.Search(target)
		tr := sl.SearchTrace(target)
		if tr.Meta.Found != want {
			t.Fatalf("target %d: Search=%v Meta.Found=%v", target, want, tr.Meta.Found)
		}
		if tr.Meta.TargetValue != fmt.Sprint(target) {
			t.Fatalf("target %d: meta target string %q", target, tr.Meta.TargetValue)
		}
	}
}

func TestSearchTrace_StepPhases(t *testing.T) {
	sl := NewForTest[int](1)
	sl.Insert(10)
	sl.Insert(20)

	tr := sl.SearchTrace(15)
	if len(tr.Steps) < 4 {
		t.Fatalf("expected several steps, got %d", len(tr.Steps))
	}
	if tr.Steps[0].Phase != PhaseAtLevel {
		t.Fatalf("first step phase: got %q", tr.Steps[0].Phase)
	}
	if tr.Steps[len(tr.Steps)-1].Phase != PhaseDone {
		t.Fatalf("last step phase: got %q", tr.Steps[len(tr.Steps)-1].Phase)
	}
	if tr.SchemaVersion != TraceSchemaVersion || tr.Kind != TraceKindSearch {
		t.Fatalf("envelope: version=%d kind=%q", tr.SchemaVersion, tr.Kind)
	}
}

func TestSearchTrace_NodeIDsStableAcrossSteps(t *testing.T) {
	sl := NewForTest[int](99)
	sl.Insert(1)
	sl.Insert(2)

	tr := sl.SearchTrace(2)
	if len(tr.Steps) == 0 {
		t.Fatal("no steps")
	}
	ids0 := tr.Steps[0].Graph.Nodes
	for _, step := range tr.Steps[1:] {
		if len(step.Graph.Nodes) != len(ids0) {
			t.Fatalf("node count changed: %d vs %d", len(step.Graph.Nodes), len(ids0))
		}
		for i := range ids0 {
			if step.Graph.Nodes[i].ID != ids0[i].ID {
				t.Fatalf("node id drift at step: %s vs %s", step.Graph.Nodes[i].ID, ids0[i].ID)
			}
		}
	}
}
