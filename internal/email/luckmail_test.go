package email

import "testing"

func TestGetDefaultLuckMailDomainsFiltersByEmailType(t *testing.T) {
	domains := GetDefaultLuckMailDomains("ms_imap")
	want := []string{"hotmail.com", "outlook.com", "outlook.cl", "outlook.my", "outlook.fr"}

	if len(domains) != len(want) {
		t.Fatalf("expected %d ms_imap domains, got %d", len(want), len(domains))
	}

	for i, domain := range domains {
		if domain.Domain != want[i] {
			t.Fatalf("domain %d: expected %q, got %q", i, want[i], domain.Domain)
		}
		if domain.EmailType != "ms_imap" {
			t.Fatalf("domain %d: expected email type ms_imap, got %q", i, domain.EmailType)
		}
	}
}

func TestGetDefaultLuckMailDomainsReturnsGoogleVariantDomains(t *testing.T) {
	domains := GetDefaultLuckMailDomains("google_variant")
	want := []string{"gmail.com", "googlemail.com"}

	if len(domains) != len(want) {
		t.Fatalf("expected %d google_variant domains, got %d", len(want), len(domains))
	}

	for i, domain := range domains {
		if domain.Domain != want[i] {
			t.Fatalf("domain %d: expected %q, got %q", i, want[i], domain.Domain)
		}
		if domain.EmailType != "google_variant" {
			t.Fatalf("domain %d: expected email type google_variant, got %q", i, domain.EmailType)
		}
	}
}

func TestGetDefaultLuckMailDomainsIncludesSelfBuiltDomains(t *testing.T) {
	domains := GetDefaultLuckMailDomains("self_built")
	if len(domains) != 26 {
		t.Fatalf("expected 26 self_built domains, got %d", len(domains))
	}

	if domains[0].Domain != "mail.agentsforge.org" {
		t.Fatalf("expected first self_built domain mail.agentsforge.org, got %q", domains[0].Domain)
	}
	if domains[len(domains)-1].Domain != "caijiuduolian.bbroot.com" {
		t.Fatalf("expected last self_built domain caijiuduolian.bbroot.com, got %q", domains[len(domains)-1].Domain)
	}
	for i, domain := range domains {
		if domain.EmailType != "self_built" {
			t.Fatalf("domain %d: expected email type self_built, got %q", i, domain.EmailType)
		}
	}
}

func TestGetDefaultLuckMailDomainsReturnsAllWhenEmailTypeEmpty(t *testing.T) {
	domains := GetDefaultLuckMailDomains("")
	if len(domains) < 33 {
		t.Fatalf("expected at least 33 default domains, got %d", len(domains))
	}
}
