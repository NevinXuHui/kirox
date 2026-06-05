package task

import (
	"testing"
	"time"
)

func TestWaitBeforeNextConcurrentLaunchSkipsFirstAndLastTask(t *testing.T) {
	var waits []time.Duration
	waitBeforeNextConcurrentLaunch(0, 3, 2, func(d time.Duration) {
		waits = append(waits, d)
	})
	waitBeforeNextConcurrentLaunch(1, 3, 2, func(d time.Duration) {
		waits = append(waits, d)
	})
	waitBeforeNextConcurrentLaunch(2, 3, 2, func(d time.Duration) {
		waits = append(waits, d)
	})

	if len(waits) != 2 {
		t.Fatalf("expected 2 waits between 3 launches, got %d", len(waits))
	}
	for i, wait := range waits {
		if wait != 2*time.Second {
			t.Fatalf("wait %d: expected 2s, got %s", i, wait)
		}
	}
}

func TestWaitBeforeNextConcurrentLaunchIgnoresZeroDelay(t *testing.T) {
	called := false
	waitBeforeNextConcurrentLaunch(0, 3, 0, func(d time.Duration) {
		called = true
	})

	if called {
		t.Fatal("expected no wait when delay is zero")
	}
}
