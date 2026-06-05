package email

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"reg_go/internal/storage"
)

// getLuckMailConfigPath 获取 LuckMail 配置文件路径
func getLuckMailConfigPath() string {
	return filepath.Join(storage.GetDataDir(), "luckmail.dat")
}

// GetLuckMailConfigs 获取 LuckMail 配置列表
func GetLuckMailConfigs() []LuckMailConfig {
	data, err := os.ReadFile(getLuckMailConfigPath())
	if err != nil {
		return []LuckMailConfig{}
	}

	var configs []LuckMailConfig
	if err := json.Unmarshal(data, &configs); err != nil {
		log.Printf("[LuckMail] 配置文件格式无效，已重置: %v", err)
		os.Remove(getLuckMailConfigPath())
		return []LuckMailConfig{}
	}

	return configs
}

// SaveLuckMailConfigs 保存 LuckMail 配置列表
func SaveLuckMailConfigs(configsJSON string) map[string]interface{} {
	var configs []LuckMailConfig
	if err := json.Unmarshal([]byte(configsJSON), &configs); err != nil {
		return map[string]interface{}{"error": "配置格式错误: " + err.Error()}
	}

	for i, cfg := range configs {
		if cfg.Name == "" {
			return map[string]interface{}{"error": fmt.Sprintf("第 %d 个配置缺少名称", i+1)}
		}
		if cfg.Token == "" {
			return map[string]interface{}{"error": fmt.Sprintf("配置 %s 缺少接口秘钥", cfg.Name)}
		}
		if cfg.ProjectCode == "" {
			return map[string]interface{}{"error": fmt.Sprintf("配置 %s 缺少项目代码", cfg.Name)}
		}
	}

	jsonData, _ := json.Marshal(configs)
	os.MkdirAll(filepath.Dir(getLuckMailConfigPath()), 0755)
	if err := os.WriteFile(getLuckMailConfigPath(), jsonData, 0600); err != nil {
		return map[string]interface{}{"error": "保存失败: " + err.Error()}
	}

	log.Printf("[LuckMail] 已保存 %d 个配置", len(configs))
	return map[string]interface{}{"success": true}
}

// TestLuckMailConnection 测试 LuckMail 连接
func TestLuckMailConnection(configJSON string) map[string]interface{} {
	var config LuckMailConfig
	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		return map[string]interface{}{"error": "配置格式错误: " + err.Error()}
	}

	client := NewLuckMailClient(config)
	balance, err := client.TestConnection()
	if err != nil {
		return map[string]interface{}{"error": "连接失败: " + err.Error()}
	}

	// 获取项目列表
	projects, _ := client.GetProjects()
	projectNames := make([]string, 0, len(projects))
	for _, p := range projects {
		projectNames = append(projectNames, p.Code+" ("+p.Name+")")
	}

	// 使用内置域名列表
	domains := GetDefaultLuckMailDomains(config.EmailType)
	domainList := make([]map[string]interface{}, 0, len(domains))
	for _, d := range domains {
		item := map[string]interface{}{
			"domain":     d.Domain,
			"email_type": d.EmailType,
		}
		if d.Count > 0 {
			item["count"] = d.Count
		}
		domainList = append(domainList, item)
	}

	return map[string]interface{}{
		"success":  true,
		"balance":  balance,
		"projects": projectNames,
		"domains":  domainList,
	}
}

// GetLuckMailDomains 获取 LuckMail 可用域名列表
func GetLuckMailDomains(configJSON string) map[string]interface{} {
	var config LuckMailConfig
	if err := json.Unmarshal([]byte(configJSON), &config); err != nil {
		return map[string]interface{}{"error": "配置格式错误: " + err.Error()}
	}

	// 直接使用内置域名列表
	domains := GetDefaultLuckMailDomains(config.EmailType)

	domainList := make([]map[string]interface{}, 0, len(domains))
	for _, d := range domains {
		item := map[string]interface{}{
			"domain":     d.Domain,
			"email_type": d.EmailType,
		}
		if d.Count > 0 {
			item["count"] = d.Count
		}
		domainList = append(domainList, item)
	}

	return map[string]interface{}{
		"success": true,
		"domains": domainList,
	}
}
