package proxy

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

// ClashConfig Clash 外部控制配置
type ClashConfig struct {
	URL    string `json:"url"`    // 外部控制地址，如 http://127.0.0.1:9090
	Secret string `json:"secret"` // 认证密钥
}

// ClashProxy Clash 代理节点信息
type ClashProxy struct {
	Name    string   `json:"name"`
	Type    string   `json:"type"`
	Now     string   `json:"now,omitempty"`     // 当前选中的节点（仅 Selector/URLTest 等组有）
	All     []string `json:"all,omitempty"`     // 可选节点列表
	History []struct {
		Time  string `json:"time"`
		Delay int    `json:"delay"`
	} `json:"history,omitempty"`
	UDP bool `json:"udp"`
}

// ClashProxiesResponse Clash /proxies 响应
type ClashProxiesResponse struct {
	Proxies map[string]ClashProxy `json:"proxies"`
}

// ClashClient Clash API 客户端
type ClashClient struct {
	config ClashConfig
	client *http.Client
	mu     sync.Mutex
}

var (
	clashClient     *ClashClient
	clashClientOnce sync.Once
)

// InitClash 初始化 Clash 客户端（可选配置，留空则禁用）
func InitClash(config ClashConfig) {
	clashClientOnce.Do(func() {
		clashClient = &ClashClient{
			config: config,
			client: &http.Client{
				Timeout: 10 * time.Second,
			},
		}
	})
}

// GetClashClient 获取全局 Clash 客户端实例
func GetClashClient() *ClashClient {
	return clashClient
}

// UpdateConfig 更新 Clash 配置
func (c *ClashClient) UpdateConfig(config ClashConfig) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.config = config
}

// GetConfig 获取当前配置
func (c *ClashClient) GetConfig() ClashConfig {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.config
}

// IsEnabled 是否已配置 Clash
func (c *ClashClient) IsEnabled() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.config.URL != "" && c.config.Secret != ""
}

// doRequest 执行 HTTP 请求
func (c *ClashClient) doRequest(method, path string, body interface{}) ([]byte, error) {
	c.mu.Lock()
	config := c.config
	c.mu.Unlock()

	if config.URL == "" {
		return nil, fmt.Errorf("Clash 外部控制地址未配置")
	}

	// 自动补全协议前缀
	baseURL := config.URL
	if !strings.HasPrefix(baseURL, "http://") && !strings.HasPrefix(baseURL, "https://") {
		baseURL = "http://" + baseURL
	}

	url := strings.TrimRight(baseURL, "/") + path

	var reqBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("序列化请求体失败: %w", err)
		}
		reqBody = bytes.NewReader(jsonData)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("创建请求失败: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if config.Secret != "" {
		req.Header.Set("Authorization", "Bearer "+config.Secret)
	}

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		return nil, fmt.Errorf("请求失败 (HTTP %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// GetProxies 获取所有代理组和节点
func (c *ClashClient) GetProxies() (map[string]ClashProxy, error) {
	data, err := c.doRequest("GET", "/proxies", nil)
	if err != nil {
		return nil, err
	}

	var resp ClashProxiesResponse
	if err := json.Unmarshal(data, &resp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	return resp.Proxies, nil
}

// GetProxyGroups 获取可切换的代理组（只返回全局代理组）
func (c *ClashClient) GetProxyGroups() ([]ClashProxy, error) {
	proxies, err := c.GetProxies()
	if err != nil {
		return nil, err
	}

	var groups []ClashProxy
	// 优先查找常见的全局代理组名称
	globalNames := []string{"GLOBAL", "Proxy", "节点选择", "🚀 节点选择"}

	for _, name := range globalNames {
		if proxy, ok := proxies[name]; ok && len(proxy.All) > 0 {
			proxy.Name = name
			groups = append(groups, proxy)
			return groups, nil // 找到第一个全局代理组就返回
		}
	}

	// 如果没有找到常见的全局代理组，返回第一个有可选节点的代理组
	for name, proxy := range proxies {
		if len(proxy.All) > 0 {
			proxy.Name = name
			groups = append(groups, proxy)
			return groups, nil
		}
	}

	return groups, nil
}

// SwitchProxy 切换指定代理组的节点
func (c *ClashClient) SwitchProxy(group, nodeName string) error {
	body := map[string]string{
		"name": nodeName,
	}

	_, err := c.doRequest("PUT", "/proxies/"+group, body)
	if err != nil {
		return fmt.Errorf("切换节点失败: %w", err)
	}

	return nil
}

// TestConnection 测试 Clash 连接
func (c *ClashClient) TestConnection() error {
	_, err := c.doRequest("GET", "/proxies", nil)
	return err
}

// GetCurrentProxy 获取指定代理组当前选中的节点
func (c *ClashClient) GetCurrentProxy(group string) (string, error) {
	data, err := c.doRequest("GET", "/proxies/"+group, nil)
	if err != nil {
		return "", err
	}

	var proxy ClashProxy
	if err := json.Unmarshal(data, &proxy); err != nil {
		return "", fmt.Errorf("解析响应失败: %w", err)
	}

	return proxy.Now, nil
}
