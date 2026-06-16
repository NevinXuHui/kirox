package data

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadAccountsReadsBatchSubdirectories(t *testing.T) {
	outDir := t.TempDir()
	batchDir := filepath.Join(outDir, "batch-001")
	if err := os.MkdirAll(batchDir, 0o755); err != nil {
		t.Fatalf("create batch dir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(batchDir, "user@example.com.json"), []byte(`{"email":"user@example.com"}`), 0o644); err != nil {
		t.Fatalf("write account: %v", err)
	}

	accounts, err := LoadAccounts(outDir)
	if err != nil {
		t.Fatalf("load accounts: %v", err)
	}

	if len(accounts) != 1 {
		t.Fatalf("expected 1 account, got %d", len(accounts))
	}
	if accounts[0]["email"] != "user@example.com" {
		t.Fatalf("expected batch account email, got %#v", accounts[0]["email"])
	}
}
