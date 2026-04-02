package skiplist

import (
	"cmp"
	"fmt"
)

// Trace schema and kind sent to the visualization frontend.
const (
	TraceSchemaVersion = 1
	TraceKindSearch    = "skiplist-search"
)

// SearchPhase describes what the search algorithm is doing at a trace step.
type SearchPhase string

const (
	PhaseAtLevel     SearchPhase = "at_level"
	PhaseScanForward SearchPhase = "scan_forward"
	PhaseEndOfLevel  SearchPhase = "end_of_level"
	PhaseFinalCheck  SearchPhase = "final_check"
	PhaseDone        SearchPhase = "done"
)

// SearchTraceEnvelope is the top-level JSON document for skip-list search visualization.
type SearchTraceEnvelope struct {
	SchemaVersion int            `json:"schemaVersion"`
	Kind          string         `json:"kind"`
	Meta          SearchTraceMeta `json:"meta"`
	Steps         []SearchStep   `json:"steps"`
}

// SearchTraceMeta carries summary information for the player UI.
type SearchTraceMeta struct {
	TargetValue string `json:"targetValue"`
	Found       bool   `json:"found"`
}

// GraphNode is one node in a skip list snapshot (head has empty value in JSON).
type GraphNode struct {
	ID     string `json:"id"`
	Value  string `json:"value"`
	Height int    `json:"height"`
}

// GraphEdge is a forward pointer at a given level.
type GraphEdge struct {
	Level int    `json:"level"`
	From  string `json:"from"`
	To    string `json:"to"`
}

// GraphSnapshot is the full structure at one step (small N; fine for teaching demos).
type GraphSnapshot struct {
	ListLevel int         `json:"listLevel"`
	Nodes     []GraphNode `json:"nodes"`
	Edges     []GraphEdge `json:"edges"`
}

// SearchStep is one animation frame for search.
type SearchStep struct {
	ActiveLevel  int           `json:"activeLevel"`
	CursorNodeID string        `json:"cursorNodeId"`
	Phase        SearchPhase   `json:"phase"`
	Graph        GraphSnapshot `json:"graph"`
}

type nodeIDGen[T cmp.Ordered] struct {
	ids  map[*Node[T]]string
	next int
}

func newNodeIDGen[T cmp.Ordered]() *nodeIDGen[T] {
	return &nodeIDGen[T]{ids: make(map[*Node[T]]string)}
}

func (g *nodeIDGen[T]) id(sl *SkipList[T], n *Node[T]) string {
	if n == nil {
		return ""
	}
	if n == sl.head {
		return "head"
	}
	if id, ok := g.ids[n]; ok {
		return id
	}
	id := fmt.Sprintf("n%d", g.next)
	g.next++
	g.ids[n] = id
	return id
}

func (sl *SkipList[T]) graphSnapshot(g *nodeIDGen[T]) GraphSnapshot {
	var nodes []GraphNode
	var edges []GraphEdge

	for cur := sl.head; cur != nil; cur = cur.forward[0] {
		height := sl.level
		if cur != sl.head {
			height = len(cur.forward)
		}
		val := ""
		if cur != sl.head {
			val = fmt.Sprint(cur.value)
		}
		nodes = append(nodes, GraphNode{
			ID:     g.id(sl, cur),
			Value:  val,
			Height: height,
		})
		nodeLevels := sl.level
		if cur != sl.head {
			nodeLevels = len(cur.forward)
			if nodeLevels > sl.level {
				nodeLevels = sl.level
			}
		}
		for lvl := 0; lvl < nodeLevels; lvl++ {
			nxt := cur.forward[lvl]
			if nxt != nil {
				edges = append(edges, GraphEdge{
					Level: lvl,
					From:  g.id(sl, cur),
					To:    g.id(sl, nxt),
				})
			}
		}
	}

	return GraphSnapshot{
		ListLevel: sl.level,
		Nodes:     nodes,
		Edges:     edges,
	}
}

func (sl *SkipList[T]) appendStep(steps *[]SearchStep, g *nodeIDGen[T], cursor *Node[T], activeLevel int, phase SearchPhase) {
	var cursorID string
	if cursor != nil {
		cursorID = g.id(sl, cursor)
	}
	*steps = append(*steps, SearchStep{
		ActiveLevel:  activeLevel,
		CursorNodeID: cursorID,
		Phase:        phase,
		Graph:        sl.graphSnapshot(g),
	})
}

// SearchTrace records each phase of the search for val while holding RLock.
// Meta.Found matches Search(val). Node values in JSON use fmt.Sprint (best-effort for generic T).
func (sl *SkipList[T]) SearchTrace(val T) *SearchTraceEnvelope {
	sl.mu.RLock()
	defer sl.mu.RUnlock()

	g := newNodeIDGen[T]()
	steps := make([]SearchStep, 0, 16)

	current := sl.head
	for i := sl.level - 1; i >= 0; i-- {
		sl.appendStep(&steps, g, current, i, PhaseAtLevel)
		for current.forward[i] != nil && current.forward[i].value < val {
			current = current.forward[i]
			sl.appendStep(&steps, g, current, i, PhaseScanForward)
		}
		sl.appendStep(&steps, g, current, i, PhaseEndOfLevel)
	}

	cand := current.forward[0]
	sl.appendStep(&steps, g, cand, 0, PhaseFinalCheck)

	found := cand != nil && cand.value == val
	sl.appendStep(&steps, g, cand, 0, PhaseDone)

	return &SearchTraceEnvelope{
		SchemaVersion: TraceSchemaVersion,
		Kind:          TraceKindSearch,
		Meta: SearchTraceMeta{
			TargetValue: fmt.Sprint(val),
			Found:       found,
		},
		Steps: steps,
	}
}
