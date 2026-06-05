package email

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"reg_go/internal/storage"
)

// getTempMailLolConfigPath 获取 TempMail.lol 配置文件路径
func getTempMailLolConfigPath() string {
	return filepath.Join(storage.GetDataDir(), "tempmail_lol.dat")
}

// GetTempMailLolConfigs 获取 TempMail.lol 配置列表
func GetTempMailLolConfigs() []TempMailLolConfig {
	data, err := os.ReadFile(getTempMailLolConfigPath())
	if err != nil {
		return []TempMailLolConfig{}
	}

	var configs []TempMailLolConfig
	if err := json.Unmarshal(data, &configs); err != nil {
		log.Printf("[TempMail.lol] 配置文件格式无效，已重置: %v", err)
		os.Remove(getTempMailLolConfigPath())
		return []TempMailLolConfig{}
	}

	return configs
}

// SaveTempMailLolConfigs 保存 TempMail.lol 配置列表
func SaveTempMailLolConfigs(configsJSON string) map[string]interface{} {
	var configs []TempMailLolConfig
	if err := json.Unmarshal([]byte(configsJSON), &configs); err != nil {
		return map[string]interface{}{"error": "配置格式错误: " + err.Error()}
	}

	for i, cfg := range configs {
		if cfg.Name == "" {
			return map[string]interface{}{"error": fmt.Sprintf("第 %d 个配置缺少名称", i+1)}
		}
	}

	jsonData, _ := json.Marshal(configs)
	os.MkdirAll(filepath.Dir(getTempMailLolConfigPath()), 0755)
	if err := os.WriteFile(getTempMailLolConfigPath(), jsonData, 0600); err != nil {
		return map[string]interface{}{"error": "保存失败: " + err.Error()}
	}

	log.Printf("[TempMail.lol] 已保存 %d 个配置", len(configs))
	return map[string]interface{}{"success": true}
}

// TestTempMailLolConnection 测试 TempMail.lol 连接
func TestTempMailLolConnection(configJSON string) map[string]interface{} {
	var config TempMailLolConfig
	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		return map[string]interface{}{"error": "配置格式错误: " + err.Error()}
	}

	client := NewTempMailLolClient(config)
	if err := client.TestConnection(); err != nil {
		return map[string]interface{}{"error": "连接失败: " + err.Error()}
	}

	return map[string]interface{}{
		"success": true,
		"message": "连接成功",
	}
}
