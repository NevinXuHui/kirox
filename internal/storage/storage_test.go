package storage

import "testing"

func TestNormalizeProxyAddressConvertsSchemeHostPortUserPass(t *testing.T) {
	input := "socks5://us.rrp.bestgo.work:10000:USER447473-zone-custom-session-87241759-sessTime-5-sessAuto-1:dfaf73"
	want := "socks5://USER447473-zone-custom-session-87241759-sessTime-5-sessAuto-1:dfaf73@us.rrp.bestgo.work:10000"

	got := NormalizeProxyAddress(input)
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestNormalizeProxyAddressKeepsStandardProxyURL(t *testing.T) {
	input := "socks5://user:pass@host.example:10000"

	got := NormalizeProxyAddress(input)
	if got != input {
		t.Fatalf("expected %q, got %q", input, got)
	}
}
