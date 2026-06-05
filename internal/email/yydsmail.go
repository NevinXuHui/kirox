package email

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

// YYDSMailConfig YYDS Mail 配置
type YYDSMailConfig struct {
	Name        string `json:"name"`        // 配置名称
	AccessToken string `json:"accessToken"` // 访问令牌
	Domain      string `json:"domain"`      // 指定域名 (可选)
	Username    string `json:"username"`    // 指定用户名 (可选)
}

// YYDSMailClient YYDS Mail API 客户端
type YYDSMailClient struct {
	config  YYDSMailConfig
	client  *http.Client
	baseURL string
}

const yydsMailBaseURL = "https://maliapi.215.im"

// NewYYDSMailClient 创建 YYDS Mail 客户端
func NewYYDSMailClient(config YYDSMailConfig) *YYDSMailClient {
	return &YYDSMailClient{
		config:  config,
		client:  &http.Client{Timeout: 15 * time.Second},
		baseURL: yydsMailBaseURL,
	}
}

// request 发送 HTTP 请求
func (c *YYDSMailClient) request(method, path string, body string, token string) ([]byte, error) {
	url := c.baseURL + path

	var bodyReader io.Reader
	if body != "" {
		bodyReader = strings.NewReader(body)
	}

	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, err
	}

	// 设置 Authorization header
	if token != "" {
		req.Header.Set("X-API-Key", token)
	}
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
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

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

// YYDSMailResponse 统一响应格式
type YYDSMailResponse struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

// YYDSMailInboxData 创建临时邮箱响应数据
type YYDSMailInboxData struct {
	ID        string `json:"id"`
	Address   string `json:"address"`
	Token     string `json:"token"`
	ExpiresAt string `json:"expiresAt"`
}

// YYDSMailMessage 邮件消息
type YYDSMailMessage struct {
	ID      string `json:"id"`
	From    string `json:"from"`
	Subject string `json:"subject"`
	Text    string `json:"text"`
	HTML    string `json:"html"`
	Date    string `json:"createdAt"`
}

// CreateTempInbox 创建临时邮箱
func (c *YYDSMailClient) CreateTempInbox() (*YYDSMailInboxData, error) {
	reqData := map[string]interface{}{}
	if c.config.Domain != "" {
		reqData["domain"] = c.config.Domain
	}
	if c.config.Username != "" {
		reqData["localPart"] = c.config.Username
	}

	reqJSON, _ := json.Marshal(reqData)
	respBody, err := c.request("POST", "/v1/accounts", string(reqJSON), c.config.AccessToken)
	if err != nil {
		return nil, err
	}

	// 解析响应，API 返回格式是 {"success": true, "data": {...}}
	var resp struct {
		Success bool                  `json:"success"`
		Data    YYDSMailInboxData     `json:"data"`
		Error   string                `json:"error"`
	}
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}
	if !resp.Success {
		return nil, fmt.Errorf("创建失败: %s", resp.Error)
	}
	return &resp.Data, nil
}

// GetMessages 获取邮件列表
func (c *YYDSMailClient) GetMessages(address, token string) ([]YYDSMailMessage, error) {
	path := fmt.Sprintf("/v1/messages?address=%s", address)
	respBody, err := c.request("GET", path, "", token)
	if err != nil {
		return nil, err
	}

	// 解析响应，API 返回格式是 {"success": true, "data": {"messages": [...]}}
	var resp struct {
		Success bool   `json:"success"`
		Data    struct {
			Messages []YYDSMailMessage `json:"messages"`
		} `json:"data"`
		Error string `json:"error"`
	}
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, fmt.Errorf("解析消息列表失败: %w", err)
	}
	if !resp.Success {
		return nil, fmt.Errorf("获取消息失败: %s", resp.Error)
	}
	return resp.Data.Messages, nil
}

// DeleteInbox 删除临时邮箱
func (c *YYDSMailClient) DeleteInbox(inboxID, token string) error {
	path := fmt.Sprintf("/v1/accounts/%s", inboxID)
	_, err := c.request("DELETE", path, "", token)
	return err
}

// TestConnection 测试连接（通过创建临时邮箱验证）
func (c *YYDSMailClient) TestConnection() error {
	inbox, err := c.CreateTempInbox()
	if err != nil {
		return err
	}
	// 测试成功后立即删除
	_ = c.DeleteInbox(inbox.ID, inbox.Token)
	return nil
}

// YYDSMailProvider 实现邮箱提供商
type YYDSMailProvider struct {
	client  *YYDSMailClient
	inboxID string
	token   string
	address string
}

// NewYYDSMailProvider 创建 YYDS Mail 提供商（创建临时邮箱）
func NewYYDSMailProvider(config YYDSMailConfig) (*YYDSMailProvider, error) {
	client := NewYYDSMailClient(config)

	inbox, err := client.CreateTempInbox()
	if err != nil {
		return nil, fmt.Errorf("创建临时邮箱失败: %w", err)
	}

	log.Printf("[YYDS Mail] 邮箱创建成功: %s, ID: %s, 过期时间: %s",
		inbox.Address, inbox.ID, inbox.ExpiresAt)

	return &YYDSMailProvider{
		client:  client,
		inboxID: inbox.ID,
		token:   inbox.Token,
		address: inbox.Address,
	}, nil
}

// GetAddress 返回邮箱地址
func (p *YYDSMailProvider) GetAddress() string {
	return p.address
}

// WaitForCode 轮询等待验证码
func (p *YYDSMailProvider) WaitForCode(timeout, interval int) (string, error) {
	maxRetries := timeout / interval
	log.Printf("[YYDS Mail] 开始等待验证码, 邮箱: %s", p.address)

	for attempt := 1; attempt <= maxRetries; attempt++ {
		messages, err := p.client.GetMessages(p.address, p.token)
		if err != nil {
			if attempt%5 == 0 {
				log.Printf("[YYDS Mail] 查询失败: %v, 重试中...", err)
			}
			time.Sleep(time.Duration(interval) * time.Second)
			continue
		}

		// 查找包含验证码的邮件
		for _, msg := range messages {
			// 从邮件正文中提取验证码（假设是6位数字）
			code := extractVerificationCode(msg.Text)
			if code == "" {
				code = extractVerificationCode(msg.HTML)
			}
			if code != "" {
				log.Printf("[YYDS Mail] 验证码获取成功: %s", code)
				return code, nil
			}
		}

		if attempt%5 == 0 {
			log.Printf("[YYDS Mail] [%d/%d] 等待验证码中...", attempt, maxRetries)
		}
		time.Sleep(time.Duration(interval) * time.Second)
	}

	return "", fmt.Errorf("等待验证码超时 (%ds)", timeout)
}

// extractVerificationCode 从文本中提取验证码
func extractVerificationCode(text string) string {
	// 简单实现：查找6位数字
	// TODO: 根据实际邮件格式优化正则表达式
	for i := 0; i < len(text)-5; i++ {
		if isDigit(text[i]) && isDigit(text[i+1]) && isDigit(text[i+2]) &&
			isDigit(text[i+3]) && isDigit(text[i+4]) && isDigit(text[i+5]) {
			return text[i : i+6]
		}
	}
	return ""
}

func isDigit(c byte) bool {
	return c >= '0' && c <= '9'
}

// Cancel 取消邮箱（任务取消时调用）
func (p *YYDSMailProvider) Cancel() {
	if p.inboxID != "" {
		if err := p.client.DeleteInbox(p.inboxID, p.token); err != nil {
			log.Printf("[YYDS Mail] 删除邮箱失败: %v", err)
		} else {
			log.Printf("[YYDS Mail] 邮箱已删除: %s", p.address)
		}
	}
}
