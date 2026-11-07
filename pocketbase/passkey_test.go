package main

import "testing"

func TestRpidForHost(t *testing.T) {
	t.Setenv("PASSKEY_RP_DOMAINS", "nfwavemakers.com,localhost")

	cases := []struct {
		host string
		want string
		ok   bool
	}{
		{"nfwavemakers.com", "nfwavemakers.com", true},
		{"ballots.nfwavemakers.com", "nfwavemakers.com", true},
		{"localhost", "localhost", true},
		{"pb.obermillers.com", "", false},
		{"", "", false},
	}

	for _, tc := range cases {
		got, ok := rpidForHost(tc.host)
		if ok != tc.ok || got != tc.want {
			t.Fatalf("rpidForHost(%q) = %q,%v; want %q,%v", tc.host, got, ok, tc.want, tc.ok)
		}
	}
}
