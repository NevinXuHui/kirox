package email

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"reg_go/internal/storage"
)

// getYYDSMailConfigPath 获取 YYDS Mail 配置文件路径
func getYYDSMailConfigPath() string {
	return filepath.Join(storage.GetDataDir(), "yydsmail.dat")
}

// GetYYDSMailConfigs 获取 YYDS Mail 配置列表
func GetYYDSMailConfigs() []YYDSMailConfig {
	data, err := os.ReadFile(getYYDSMailConfigPath())
	if err != nil {
		return []YYDSMailConfig{}
	}

	var configs []YYDSMailConfig
	if err := json.Unmarshal(data, &configs); err != nil {
		log.Printf("[YYDS Mail] 配置文件格式无效，已重置: %v", err)
		os.Remove(getYYDSMailConfigPath())
		return []YYDSMailConfig{}
	}

	return configs
}

// SaveYYDSMailConfigs 保存 YYDS Mail 配置列表
func SaveYYDSMailConfigs(configsJSON string) map[string]interface{} {
	var configs []YYDSMailConfig
	if err := json.Unmarshal([]byte(configsJSON), &configs); err != nil {
		return map[string]interface{}{"error": "配置格式错误: " + err.Error()}
	}

	for i, cfg := range configs {
		if cfg.Name == "" {
			return map[string]interface{}{"error": fmt.Sprintf("第 %d 个配置缺少名称", i+1)}
		}
		if cfg.AccessToken == "" {
			return map[string]interface{}{"error": fmt.Sprintf("配置 %s 缺少访问令牌", cfg.Name)}
		}
	}

	jsonData, _ := json.Marshal(configs)
	os.MkdirAll(filepath.Dir(getYYDSMailConfigPath()), 0755)
	if err := os.WriteFile(getYYDSMailConfigPath(), jsonData, 0600); err != nil {
		return map[string]interface{}{"error": "保存失败: " + err.Error()}
	}

	log.Printf("[YYDS Mail] 已保存 %d 个配置", len(configs))
	return map[string]interface{}{"success": true}
}

// TestYYDSMailConnection 测试 YYDS Mail 连接
func TestYYDSMailConnection(configJSON string) map[string]interface{} {
	var config YYDSMailConfig
	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		return map[string]interface{}{"error": "配置格式错误: " + err.Error()}
	}

	client := NewYYDSMailClient(config)
	if err := client.TestConnection(); err != nil {
		return map[string]interface{}{"error": "连接失败: " + err.Error()}
	}

	return map[string]interface{}{
		"success": true,
		"message": "连接成功",
	}
}
