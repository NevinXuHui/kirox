package storage

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

// Stats 累计统计数据
type Stats struct {
	TotalCompleted int `json:"total_completed"`
	TotalSuccess   int `json:"total_success"`
	TotalFailed    int `json:"total_failed"`
}

var (
	_stats     Stats
	_statsMu   sync.RWMutex
	_statsOnce sync.Once
)

// getStatsPath 获取统计文件路径
func getStatsPath() string {
	return filepath.Join(GetDataDir(), "stats.dat")
}

// LoadStats 加载累计统计数据
func LoadStats() Stats {
	_statsOnce.Do(func() {
		data, err := os.ReadFile(getStatsPath())
		if err != nil {
			_stats = Stats{}
			return
		}
		if err := json.Unmarshal(data, &_stats); err != nil {
			_stats = Stats{}
		}
	})
	_statsMu.RLock()
	defer _statsMu.RUnlock()
	return _stats
}

// UpdateStats 更新累计统计（增量更新）
func UpdateStats(completed, success, failed int) error {
	_statsMu.Lock()
	_stats.TotalCompleted += completed
	_stats.TotalSuccess += success
	_stats.TotalFailed += failed
	data, err := json.Marshal(_stats)
	_statsMu.Unlock()

	if err != nil {
		return err
	}

	os.MkdirAll(filepath.Dir(getStatsPath()), 0755)
	return os.WriteFile(getStatsPath(), data, 0600)
}

// GetStats 获取当前累计统计
func GetStats() Stats {
	_statsMu.RLock()
	defer _statsMu.RUnlock()
	return _stats
}

// ResetStats 重置累计统计（用于测试或手动清零）
func ResetStats() error {
	_statsMu.Lock()
	_stats = Stats{}
	data, _ := json.Marshal(_stats)
	_statsMu.Unlock()

	os.MkdirAll(filepath.Dir(getStatsPath()), 0755)
	return os.WriteFile(getStatsPath(), data, 0600)
}
