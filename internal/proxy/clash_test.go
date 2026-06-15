package proxy

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClashClientGetProxies(t *testing.T) {
	// 模拟 Clash API 服务器
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/proxies" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}

		if r.Header.Get("Authorization") != "Bearer test-secret" {
			t.Errorf("unexpected auth header: %s", r.Header.Get("Authorization"))
		}

		resp := ClashProxiesResponse{
			Proxies: map[string]ClashProxy{
				"GLOBAL": {
					Name: "GLOBAL",
					Type: "Selector",
					Now:  "Proxy",
					All:  []string{"Proxy", "Direct"},
				},
				"Proxy": {
					Name: "Proxy",
					Type: "URLTest",
					Now:  "HK-01",
					All:  []string{"HK-01", "US-01"},
				},
			},
		}

		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := &ClashClient{
		config: ClashConfig{
			URL:    server.URL,
			Secret: "test-secret",
		},
		client: http.DefaultClient,
	}

	proxies, err := client.GetProxies()
	if err != nil {
		t.Fatalf("GetProxies failed: %v", err)
	}

	if len(proxies) != 2 {
		t.Errorf("expected 2 proxies, got %d", len(proxies))
	}

	if proxies["GLOBAL"].Now != "Proxy" {
		t.Errorf("expected GLOBAL.Now = Proxy, got %s", proxies["GLOBAL"].Now)
	}
}

func TestClashClientSwitchProxy(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/proxies/GLOBAL" {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}

		if r.Method != "PUT" {
			t.Errorf("expected PUT, got %s", r.Method)
		}

		var body map[string]string
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("decode body failed: %v", err)
		}

		if body["name"] != "Direct" {
			t.Errorf("expected name=Direct, got %s", body["name"])
		}

		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	client := &ClashClient{
		config: ClashConfig{
			URL:    server.URL,
			Secret: "test-secret",
		},
		client: http.DefaultClient,
	}

	err := client.SwitchProxy("GLOBAL", "Direct")
	if err != nil {
		t.Fatalf("SwitchProxy failed: %v", err)
	}
}

func TestClashClientGetProxyGroups(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := ClashProxiesResponse{
			Proxies: map[string]ClashProxy{
				"GLOBAL": {
					Type: "Selector",
					Now:  "Proxy",
					All:  []string{"Proxy", "Direct"},
				},
				"Proxy": {
					Type: "URLTest",
					Now:  "HK-01",
					All:  []string{"HK-01", "US-01"},
				},
				"HK-01": {
					Type: "Shadowsocks",
					// 终端节点没有 All 字段
				},
			},
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	client := &ClashClient{
		config: ClashConfig{
			URL:    server.URL,
			Secret: "test-secret",
		},
		client: http.DefaultClient,
	}

	groups, err := client.GetProxyGroups()
	if err != nil {
		t.Fatalf("GetProxyGroups failed: %v", err)
	}

	// 应该只返回有 All 字段的代理组（GLOBAL 和 Proxy）
	if len(groups) != 2 {
		t.Errorf("expected 2 groups, got %d", len(groups))
	}
}

func TestClashClientAutoAddHttpPrefix(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := ClashProxiesResponse{
			Proxies: map[string]ClashProxy{},
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer server.Close()

	// 去掉 http:// 前缀，只保留 host:port
	urlWithoutScheme := server.URL[7:] // 移除 "http://"

	client := &ClashClient{
		config: ClashConfig{
			URL:    urlWithoutScheme,
			Secret: "",
		},
		client: http.DefaultClient,
	}

	// 如果能成功请求，说明自动补全了 http:// 前缀
	_, err := client.GetProxies()
	if err != nil {
		t.Fatalf("GetProxies with URL without scheme failed: %v", err)
	}
}
