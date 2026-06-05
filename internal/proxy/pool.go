package proxy

import (
	"log"
	"sync"
)

// Pool 代理池，支持轮询分配和使用计数
type Pool struct {
	proxies   []string          // 代理列表
	useCounts map[string]int    // 每个代理的使用次数
	index     int               // 当前轮询索引
	mu        sync.Mutex
}

// NewPool 创建代理池
func NewPool(proxies []string) *Pool {
	if len(proxies) == 0 {
		return nil
	}

	pool := &Pool{
		proxies:   make([]string, len(proxies)),
		useCounts: make(map[string]int),
		index:     0,
	}

	copy(pool.proxies, proxies)
	for _, p := range pool.proxies {
		pool.useCounts[p] = 0
	}

	log.Printf("[代理池] 已加载 %d 个代理", len(proxies))
	return pool
}

// Acquire 获取下一个可用代理（轮询策略）
func (p *Pool) Acquire() string {
	if p == nil || len(p.proxies) == 0 {
		return ""
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	proxy := p.proxies[p.index]
	p.useCounts[proxy]++
	p.index = (p.index + 1) % len(p.proxies)

	log.Printf("[代理池] 分配代理: %s (使用次数: %d)", maskProxy(proxy), p.useCounts[proxy])
	return proxy
}

// Release 释放代理（当前实现为空，预留用于连接池管理）
func (p *Pool) Release(proxy string) {
	// 预留接口，用于未来实现连接池管理
}

// GetStats 获取代理池统计信息
func (p *Pool) GetStats() map[string]interface{} {
	if p == nil {
		return map[string]interface{}{
			"total": 0,
			"usage": map[string]int{},
		}
	}

	p.mu.Lock()
	defer p.mu.Unlock()

	usage := make(map[string]int)
	for proxy, count := range p.useCounts {
		usage[maskProxy(proxy)] = count
	}

	return map[string]interface{}{
		"total": len(p.proxies),
		"usage": usage,
	}
}

// maskProxy 遮蔽代理地址中的敏感信息（用户名/密码）
func maskProxy(proxy string) string {
	// 简单实现：只显示前10个字符
	if len(proxy) > 10 {
		return proxy[:10] + "***"
	}
	return proxy
}
