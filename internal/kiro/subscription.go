package kiro

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// SubscriptionTokenRequest 订阅 Token 请求
type SubscriptionTokenRequest struct {
	ClientToken      string `json:"clientToken"`
	ProfileArn       string `json:"profileArn"`
	Provider         string `json:"provider"`
	SubscriptionType string `json:"subscriptionType,omitempty"`
}

// SubscriptionTokenResponse 订阅 Token 响应
type SubscriptionTokenResponse struct {
	EncodedVerificationURL string `json:"encodedVerificationUrl,omitempty"`
	Status                 string `json:"status,omitempty"`
	Token                  string `json:"token,omitempty"`
	Message                string `json:"message,omitempty"`
}

// GetSubscriptionLink 获取 Amazon Q Developer Pro 订阅链接
func GetSubscriptionLink(accessToken, region string) (string, error) {
	// 确定端点
	baseURL := "https://q.us-east-1.amazonaws.com"
	if region != "" && len(region) > 3 && region[:3] == "eu-" {
		baseURL = "https://q.eu-central-1.amazonaws.com"
	}

	url := baseURL + "/CreateSubscriptionToken"

	// 构建请求体
	// 对于新注册的账号（没有现有订阅），必须指定 subscriptionType
	// 使用 Q_DEVELOPER_STANDALONE_PRO 作为默认订阅类型
	profileArn := "arn:aws:codewhisperer:us-east-1:638616132270:profile/AAAACCCCXXXX"
	reqBody := SubscriptionTokenRequest{
		ClientToken:      uuid.New().String(),
		ProfileArn:       profileArn,
		Provider:         "STRIPE",
		SubscriptionType: "Q_DEVELOPER_STANDALONE_PRO",
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("序列化请求失败: %w", err)
	}

	// 创建请求
	req, err := http.NewRequest("POST", url, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("创建请求失败: %w", err)
	}

	// 设置请求头
	machineID := uuid.New().String()
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", fmt.Sprintf("aws-sdk-js/1.0.0 ua/2.1 os/win32#10.0.19043 lang/js md/nodejs#22.22.0 api/codewhispererruntime#1.0.0 m/N,E KiroIDE-0.12.155-%s", machineID))
	req.Header.Set("x-amz-user-agent", fmt.Sprintf("aws-sdk-js/1.0.0 KiroIDE-0.12.155-%s", machineID))
	req.Header.Set("amz-sdk-invocation-id", uuid.New().String())
	req.Header.Set("amz-sdk-request", "attempt=1; max=1")

	// 发送请求
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("请求失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("读取响应失败: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API 错误 (%d): %s", resp.StatusCode, string(respBody))
	}

	// 解析响应
	var tokenResp SubscriptionTokenResponse
	if err := json.Unmarshal(respBody, &tokenResp); err != nil {
		return "", fmt.Errorf("解析响应失败: %w", err)
	}

	if tokenResp.EncodedVerificationURL == "" {
		return "", fmt.Errorf("未返回订阅链接: %s", tokenResp.Message)
	}

	return tokenResp.EncodedVerificationURL, nil
}
