package task

import (
	"fmt"
	"path/filepath"
	"testing"
	"time"
)

func TestResolveSuccessOutputDirKeepsBaseDirWhenDisabled(t *testing.T) {
	baseDir := filepath.Join(t.TempDir(), "results")

	got := resolveSuccessOutputDir(baseDir, 0, 1)

	if got != baseDir {
		t.Fatalf("expected base dir %q, got %q", baseDir, got)
	}
}

func TestNormalizeAccountsPerFolderDisablesInvalidValues(t *testing.T) {
	for _, value := range []int{-3, -1, 0} {
		t.Run(fmt.Sprintf("value_%d", value), func(t *testing.T) {
			if got := normalizeAccountsPerFolder(value); got != 0 {
				t.Fatalf("expected 0, got %d", got)
			}
		})
	}
}

func TestNormalizeAccountsPerFolderKeepsPositiveValues(t *testing.T) {
	if got := normalizeAccountsPerFolder(5); got != 5 {
		t.Fatalf("expected 5, got %d", got)
	}
}

func TestIsKillSwitchErrorIgnoresRegistrationBlocked(t *testing.T) {
	blockedErrors := []string{
		"注册被拦截: 请更换IP或稍后重试",
		"BLOCKED",
		"注册请求被拦截",
	}

	for _, errMsg := range blockedErrors {
		t.Run(errMsg, func(t *testing.T) {
			if isKillSwitchError(errMsg) {
				t.Fatalf("expected %q to skip global kill switch", errMsg)
			}
		})
	}
}

func TestIsKillSwitchErrorKeepsExplicitFingerprintDetection(t *testing.T) {
	if !isKillSwitchError("注册失败: IP或浏览器指纹被检测，请更换代理或重新生成指纹") {
		t.Fatal("expected explicit fingerprint detection to trigger kill switch")
	}
}

func TestResolveSuccessOutputDirGroupsBySuccessfulAccountCount(t *testing.T) {
	baseDir := filepath.Join(t.TempDir(), "results")
	tests := []struct {
		name              string
		accountsPerFolder int
		successCount      int
		wantBatch         string
	}{
		{name: "first account in first batch", accountsPerFolder: 2, successCount: 1, wantBatch: "batch-001"},
		{name: "last account in first batch", accountsPerFolder: 2, successCount: 2, wantBatch: "batch-001"},
		{name: "first account in second batch", accountsPerFolder: 2, successCount: 3, wantBatch: "batch-002"},
		{name: "third batch uses padded number", accountsPerFolder: 2, successCount: 5, wantBatch: "batch-003"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := resolveSuccessOutputDir(baseDir, tt.accountsPerFolder, tt.successCount)
			want := filepath.Join(baseDir, tt.wantBatch)
			if got != want {
				t.Fatalf("expected %q, got %q", want, got)
			}
		})
	}
}

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
