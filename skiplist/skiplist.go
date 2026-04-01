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
	source := rand.NewSource(time.Now().UnixNano())
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

// Search checks if an element exists in the Skip List.
func (sl *SkipList[T]) Search(val T) bool {
	sl.mu.RLock()
	defer sl.mu.RUnlock()

	current := sl.head

	// Traverse from top level down to level 0
	for i := sl.level - 1; i >= 0; i-- {
		for current.forward[i] != nil && current.forward[i].value < val {
			current = current.forward[i]
		}
	}

	// Move to the next node at level 0
	current = current.forward[0]

	// Check if the current node contains the target value
	return current != nil && current.value == val
}
