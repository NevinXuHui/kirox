package email

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// TempMailLolConfig TempMail.lol 配置
type TempMailLolConfig struct {
	Name   string `json:"name"`   // 配置名称
	APIKey string `json:"apiKey"` // API密钥（可选，免费层不需要）
	Prefix string `json:"prefix"` // 邮箱前缀（可选）
	Domain string `json:"domain"` // 自定义域名（可选）
}

// TempMailLolClient TempMail.lol API 客户端
type TempMailLolClient struct {
	config  TempMailLolConfig
	client  *http.Client
	baseURL string
}

const tempMailLolBaseURL = "https://api.tempmail.lol"

// NewTempMailLolClient 创建 TempMail.lol 客户端
func NewTempMailLolClient(config TempMailLolConfig) *TempMailLolClient {
	return &TempMailLolClient{
		config:  config,
		client:  &http.Client{Timeout: 15 * time.Second},
		baseURL: tempMailLolBaseURL,
	}
}

// request 发送 HTTP 请求
func (c *TempMailLolClient) request(method, path string, body string) ([]byte, error) {
	url := c.baseURL + path

	req, err := http.NewRequest(method, url, nil)
	if err != nil {
		return nil, err
	}

	// 如果有 API Key，设置认证头
	if c.config.APIKey != "" {
		req.Header.Set("Authorization", "Bearer "+c.config.APIKey)
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

// TempMailLolInboxData 创建临时邮箱响应数据
type TempMailLolInboxData struct {
	Address string `json:"address"`
	Token   string `json:"token"`
}

// TempMailLolMessage 邮件消息
type TempMailLolMessage struct {
	From    string `json:"from"`
	To      string `json:"to"`
	Subject string `json:"subject"`
	Body    string `json:"body"`
	HTML    string `json:"html"`
	Date    int64  `json:"date"` // Unix timestamp in milliseconds
}

// TempMailLolEmailsResponse 邮件列表响应
type TempMailLolEmailsResponse struct {
	Email []TempMailLolMessage `json:"email"`
}

// CreateInbox 创建临时邮箱
func (c *TempMailLolClient) CreateInbox() (*TempMailLolInboxData, error) {
	path := "/generate"

	// 如果指定了前缀，添加到路径
	if c.config.Prefix != "" {
		path = path + "/" + c.config.Prefix
	}

	// 如果指定了域名，添加查询参数
	if c.config.Domain != "" {
		path = path + "?domain=" + c.config.Domain
	}

	respBody, err := c.request("GET", path, "")
	if err != nil {
		return nil, err
	}

	var inbox TempMailLolInboxData
	if err := json.Unmarshal(respBody, &inbox); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}

	return &inbox, nil
}

// GetMessages 获取邮件列表
func (c *TempMailLolClient) GetMessages(token string) ([]TempMailLolMessage, error) {
	path := fmt.Sprintf("/auth/%s", token)
	respBody, err := c.request("GET", path, "")
	if err != nil {
		return nil, err
	}

	var resp TempMailLolEmailsResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, fmt.Errorf("解析消息列表失败: %w", err)
	}

	return resp.Email, nil
}

// TestConnection 测试连接（通过创建临时邮箱验证）
func (c *TempMailLolClient) TestConnection() error {
	_, err := c.CreateInbox()
	return err
}

// TempMailLolProvider 实现邮箱提供商
type TempMailLolProvider struct {
	client  *TempMailLolClient
	token   string
	address string
}

// NewTempMailLolProvider 创建 TempMail.lol 提供商（创建临时邮箱）
func NewTempMailLolProvider(config TempMailLolConfig) (*TempMailLolProvider, error) {
	client := NewTempMailLolClient(config)

	inbox, err := client.CreateInbox()
	if err != nil {
		return nil, fmt.Errorf("创建临时邮箱失败: %w", err)
	}

	log.Printf("[TempMail.lol] 邮箱创建成功: %s, Token: %s",
		inbox.Address, inbox.Token)

	return &TempMailLolProvider{
		client:  client,
		token:   inbox.Token,
		address: inbox.Address,
	}, nil
}

// GetAddress 返回邮箱地址
func (p *TempMailLolProvider) GetAddress() string {
	return p.address
}

// WaitForCode 轮询等待验证码
func (p *TempMailLolProvider) WaitForCode(timeout, interval int) (string, error) {
	maxRetries := timeout / interval
	log.Printf("[TempMail.lol] 开始等待验证码, 邮箱: %s", p.address)

	for attempt := 1; attempt <= maxRetries; attempt++ {
		messages, err := p.client.GetMessages(p.token)
		if err != nil {
			if attempt%5 == 0 {
				log.Printf("[TempMail.lol] 查询失败: %v, 重试中...", err)
			}
			time.Sleep(time.Duration(interval) * time.Second)
			continue
		}

		// 查找包含验证码的邮件
		for _, msg := range messages {
			// 从邮件正文中提取验证码（假设是6位数字）
			code := extractVerificationCode(msg.Body)
			if code == "" && msg.HTML != "" {
				code = extractVerificationCode(msg.HTML)
			}
			if code != "" {
				log.Printf("[TempMail.lol] 验证码获取成功: %s", code)
				return code, nil
			}
		}

		if attempt%5 == 0 {
			log.Printf("[TempMail.lol] [%d/%d] 等待验证码中...", attempt, maxRetries)
		}
		time.Sleep(time.Duration(interval) * time.Second)
	}

	return "", fmt.Errorf("等待验证码超时 (%ds)", timeout)
}

// Cancel 取消邮箱（TempMail.lol 邮箱会自动过期，无需手动删除）
func (p *TempMailLolProvider) Cancel() {
	log.Printf("[TempMail.lol] 邮箱将自动过期: %s", p.address)
}
