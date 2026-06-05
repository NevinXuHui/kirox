package data

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// SaveKiroSuccess 将成功注册的账号保存为独立的 JSON 文件。
// 文件名格式: email@domain.json，同邮箱以最新一条覆盖；仅处理成功记录（失败/封号不落盘，只留在运行日志）。
func SaveKiroSuccess(result map[string]interface{}, outDir string) error {
	if result == nil || result["status"] != "success" {
		return nil
	}
	emailAddr, _ := result["email"].(string)
	if emailAddr == "" {
		return fmt.Errorf("缺少 email 字段")
	}

	at, _ := result["aws_token"].(map[string]interface{})
	if at == nil {
		at = map[string]interface{}{}
	}
	verify, _ := result["verify"].(map[string]interface{})
	item := map[string]interface{}{
		"refreshToken": at["refreshToken"],
		"provider":     "BuilderId",
		"clientId":     result["client_id"],
		"clientSecret": result["client_secret"],
		"region":       "us-east-1",
		"email":        emailAddr,
		"password":     result["password"],
		"time":         time.Now().Format("2006-01-02 15:04:05"),
	}
	if verify != nil {
		item["creditUsed"] = verify["credit_used"]
		item["creditLimit"] = verify["credit_limit"]
		item["subscription"] = verify["subscription"]
	}
	// 保存订阅链接（如果有）
	if subscriptionLink, ok := result["subscriptionLink"].(string); ok && subscriptionLink != "" {
		item["subscriptionLink"] = subscriptionLink
	}

	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return fmt.Errorf("创建输出目录失败: %w", err)
	}

	// 保存为独立文件: email@domain.json
	filename := emailAddr + ".json"
	path := filepath.Join(outDir, filename)

	b, err := json.MarshalIndent(item, "", "  ")
	if err != nil {
		return fmt.Errorf("序列化 JSON 失败: %w", err)
	}

	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, b, 0o644); err != nil {
		return fmt.Errorf("写入临时文件失败: %w", err)
	}
	if err := os.Rename(tmp, path); err != nil {
		return fmt.Errorf("重命名文件失败: %w", err)
	}

	log.Printf("[Kiro] 结果已保存: %s", path)
	return nil
}

// LoadAccounts 读取 outDir 下所有独立的账号 JSON 文件（email@domain.json 格式）。
func LoadAccounts(outDir string) ([]map[string]interface{}, error) {
	entries, err := os.ReadDir(outDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}

	var accounts []map[string]interface{}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		// 只读取 email@domain.json 格式的文件，跳过 accounts.json 等
		if !strings.HasSuffix(name, ".json") || name == "accounts.json" {
			continue
		}

		path := filepath.Join(outDir, name)
		b, err := os.ReadFile(path)
		if err != nil {
			log.Printf("读取账号文件失败 %s: %v", name, err)
			continue
		}

		var acc map[string]interface{}
		if err := json.Unmarshal(b, &acc); err != nil {
			log.Printf("解析账号文件失败 %s: %v", name, err)
			continue
		}

		accounts = append(accounts, acc)
	}

	return accounts, nil
}

// DeleteAccount 删除指定邮箱的独立 JSON 文件；返回是否实际删除。
func DeleteAccount(outDir, email string) (bool, error) {
	if email == "" {
		return false, fmt.Errorf("邮箱地址为空")
	}

	filename := email + ".json"
	path := filepath.Join(outDir, filename)

	// 检查文件是否存在
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return false, nil
	}

	// 删除文件
	if err := os.Remove(path); err != nil {
		return false, fmt.Errorf("删除文件失败: %w", err)
	}

	log.Printf("[Data] 已删除账号文件: %s", filename)
	return true, nil
}
