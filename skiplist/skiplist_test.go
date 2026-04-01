package skiplist

import (
	"math/rand"
	"sync"
	"testing"
)

func TestSkipList_BasicInt(t *testing.T) {
	sl := New[int]()

	// Test Search on empty list
	if sl.Search(10) {
		t.Error("Search(10) on empty list returned true, expected false")
	}

	// Insert elements
	sl.Insert(10)
	sl.Insert(20)
	sl.Insert(5)

	// Test Search for existing elements
	if !sl.Search(10) {
		t.Error("Search(10) returned false, expected true")
	}
	if !sl.Search(20) {
		t.Error("Search(20) returned false, expected true")
	}
	if !sl.Search(5) {
		t.Error("Search(5) returned false, expected true")
	}

	// Test Search for non-existing elements
	if sl.Search(15) {
		t.Error("Search(15) returned true, expected false")
	}
	if sl.Search(100) {
		t.Error("Search(100) returned true, expected false")
	}
}

func TestSkipList_BasicString(t *testing.T) {
	sl := New[string]()

	sl.Insert("apple")
	sl.Insert("banana")
	sl.Insert("cherry")

	if !sl.Search("banana") {
		t.Error(`Search("banana") returned false, expected true`)
	}
	if sl.Search("date") {
		t.Error(`Search("date") returned true, expected false`)
	}
}

func TestSkipList_LargeSequential(t *testing.T) {
	sl := New[int]()
	numElements := 1000

	for i := 0; i < numElements; i++ {
		sl.Insert(i)
	}

	for i := 0; i < numElements; i++ {
		if !sl.Search(i) {
			t.Errorf("Search(%d) returned false, expected true", i)
		}
	}
}

func TestSkipList_ConcurrentInsertionAndSearch(t *testing.T) {
	sl := New[int]()
	var wg sync.WaitGroup
	numGoroutines := 100
	numInsertionsPerGoroutine := 100

	// Concurrent insertions
	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(start int) {
			defer wg.Done()
			for j := 0; j < numInsertionsPerGoroutine; j++ {
				sl.Insert(start + j)
			}
		}(i * numInsertionsPerGoroutine)
	}

	// Concurrent searches while inserting
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				val := rand.Intn(numGoroutines * numInsertionsPerGoroutine)
				// We don't assert the result because it might be inserted after the search
				sl.Search(val)
			}
		}()
	}

	wg.Wait()

	// Verify all elements were inserted
	for i := 0; i < numGoroutines*numInsertionsPerGoroutine; i++ {
		if !sl.Search(i) {
			t.Errorf("Search(%d) returned false, expected true after concurrent insertions", i)
		}
	}
}
