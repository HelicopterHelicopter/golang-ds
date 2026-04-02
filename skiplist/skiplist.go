package skiplist

import (
	"cmp"
	"math/rand"
	"sync"
	"time"
)

const (
	defaultMaxLevel    = 32
	defaultProbability = 0.5
)

// Node represents an element in the Skip List.
type Node[T cmp.Ordered] struct {
	value   T
	forward []*Node[T]
}

// SkipList represents a probabilistic alternative to balanced trees.
// It is thread-safe for concurrent read and exclusive write access.
type SkipList[T cmp.Ordered] struct {
	head        *Node[T]
	maxLevel    int
	level       int
	probability float64
	mu          sync.RWMutex
	rng         *rand.Rand
}

// New creates and initializes a new Skip List with default settings.
func New[T cmp.Ordered]() *SkipList[T] {
	return NewWithConfig[T](defaultMaxLevel, defaultProbability)
}

// NewWithConfig creates a new Skip List with custom configuration.
func NewWithConfig[T cmp.Ordered](maxLevel int, probability float64) *SkipList[T] {
	return NewWithSource[T](maxLevel, probability, rand.NewSource(time.Now().UnixNano()))
}

// NewWithSource creates a new Skip List with an explicit random source (for reproducible tests and traces).
func NewWithSource[T cmp.Ordered](maxLevel int, probability float64, source rand.Source) *SkipList[T] {
	return &SkipList[T]{
		head: &Node[T]{
			forward: make([]*Node[T], maxLevel),
		},
		maxLevel:    maxLevel,
		level:       1,
		probability: probability,
		rng:         rand.New(source),
	}
}

// NewForTest builds a skip list with default max level and probability using a fixed RNG seed.
func NewForTest[T cmp.Ordered](seed int64) *SkipList[T] {
	return NewWithSource[T](defaultMaxLevel, defaultProbability, rand.NewSource(seed))
}

// randomLevel generates a random level for a new node.
func (sl *SkipList[T]) randomLevel() int {
	lvl := 1
	for sl.rng.Float64() < sl.probability && lvl < sl.maxLevel {
		lvl++
	}
	return lvl
}

// Insert adds a new element to the Skip List.
func (sl *SkipList[T]) Insert(val T) {
	sl.mu.Lock()
	defer sl.mu.Unlock()

	update := make([]*Node[T], sl.maxLevel)
	current := sl.head

	// Traverse from top level down to level 0
	for i := sl.level - 1; i >= 0; i-- {
		for current.forward[i] != nil && current.forward[i].value < val {
			current = current.forward[i]
		}
		update[i] = current
	}

	// We allow duplicates, so we always insert.
	// Generate random level for new node.
	lvl := sl.randomLevel()

	// If random level is greater than current level, update head connections.
	if lvl > sl.level {
		for i := sl.level; i < lvl; i++ {
			update[i] = sl.head
		}
		sl.level = lvl
	}

	// Create new node
	newNode := &Node[T]{
		value:   val,
		forward: make([]*Node[T], lvl),
	}

	// Splice new node into the list at each level
	for i := 0; i < lvl; i++ {
		newNode.forward[i] = update[i].forward[i]
		update[i].forward[i] = newNode
	}
}

// searchPredAndCandidate returns the level-0 predecessor and its forward[0] for a search key.
// Caller must hold at least an RLock.
func (sl *SkipList[T]) searchPredAndCandidate(val T) (pred *Node[T], candidate *Node[T]) {
	current := sl.head
	for i := sl.level - 1; i >= 0; i-- {
		for current.forward[i] != nil && current.forward[i].value < val {
			current = current.forward[i]
		}
	}
	return current, current.forward[0]
}

// Search checks if an element exists in the Skip List.
func (sl *SkipList[T]) Search(val T) bool {
	sl.mu.RLock()
	defer sl.mu.RUnlock()
	_, cand := sl.searchPredAndCandidate(val)
	return cand != nil && cand.value == val
}
