package email

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// LuckMailConfig LuckMail 配置
type LuckMailConfig struct {
	Name        string `json:"name"`        // 配置名称
	Token       string `json:"token"`       // 接口秘钥
	ProjectCode string `json:"projectCode"` // 项目代码
	EmailType   string `json:"emailType"`   // 邮箱类型 (ms_graph/ms_imap/google_variant/self_built, 可选)
	Domain      string `json:"domain"`      // 指定域名 (可选)
	BaseURL     string `json:"baseURL"`     // API 地址 (可选，默认 https://mails.luckyous.com)
}

// LuckMailClient LuckMail API 客户端
type LuckMailClient struct {
	config  LuckMailConfig
	client  *http.Client
	baseURL string
}

const defaultLuckMailBaseURL = "https://mails.luckyous.com"

// NewLuckMailClient 创建 LuckMail 客户端
func NewLuckMailClient(config LuckMailConfig) *LuckMailClient {
	baseURL := config.BaseURL
	if baseURL == "" {
		baseURL = defaultLuckMailBaseURL
	}
	// 移除末尾的斜杠
	baseURL = strings.TrimSuffix(baseURL, "/")

	return &LuckMailClient{
		config:  config,
		client:  &http.Client{Timeout: 15 * time.Second},
		baseURL: baseURL,
	}
}

// sign 生成 HMAC-SHA256 签名
func (c *LuckMailClient) sign(method, path, timestamp, body string) string {
	message := method + path + timestamp + body
	mac := hmac.New(sha256.New, []byte(c.config.Token))
	mac.Write([]byte(message))
	return hex.EncodeToString(mac.Sum(nil))
}

// request 发送带签名的 HTTP 请求
func (c *LuckMailClient) request(method, path string, body string) ([]byte, error) {
	url := c.baseURL + path
	timestamp := fmt.Sprintf("%d", time.Now().Unix())
	signature := c.sign(method, path, timestamp, body)

	var bodyReader io.Reader
	if body != "" {
		bodyReader = strings.NewReader(body)
	}

	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, err
	}

	req.Header.Set("X-API-Key", c.config.Token)
	req.Header.Set("X-Timestamp", timestamp)
	req.Header.Set("X-Signature", signature)
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

	return respBody, nil
}

// LuckMailResponse 统一响应格式
type LuckMailResponse struct {
	Code    int             `json:"code"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

// LuckMailOrderData 创建订单响应数据
type LuckMailOrderData struct {
	OrderNo        string `json:"order_no"`
	EmailAddress   string `json:"email_address"`
	Project        string `json:"project"`
	Price          string `json:"price"`          // API 返回字符串
	TimeoutSeconds int    `json:"timeout_seconds"`
	ExpiredAt      string `json:"expired_at"`
}

// LuckMailCodeData 轮询验证码响应数据
type LuckMailCodeData struct {
	OrderNo          string `json:"order_no"`
	Status           string `json:"status"` // pending/success/timeout/cancelled
	VerificationCode string `json:"verification_code"`
	MailFrom         string `json:"mail_from"`
	MailSubject      string `json:"mail_subject"`
}

// LuckMailProjectItem 项目列表项
type LuckMailProjectItem struct {
	Code string `json:"code"`
	Name string `json:"name"`
}

// LuckMailDomainItem 域名列表项
type LuckMailDomainItem struct {
	Domain    string `json:"domain"`
	EmailType string `json:"email_type"`
	Count     int    `json:"count,omitempty"` // 可用数量（如果API返回）
}

var defaultLuckMailDomains = []LuckMailDomainItem{
	// Microsoft Graph 域名
	{Domain: "outlook.com", EmailType: "ms_graph", Count: 361802},
	{Domain: "hotmail.com", EmailType: "ms_graph", Count: 133313},
	{Domain: "outlook.de", EmailType: "ms_graph", Count: 3392},
	{Domain: "outlook.es", EmailType: "ms_graph"},
	// Microsoft IMAP 域名
	{Domain: "hotmail.com", EmailType: "ms_imap", Count: 103083},
	{Domain: "outlook.com", EmailType: "ms_imap", Count: 63247},
	{Domain: "outlook.cl", EmailType: "ms_imap", Count: 37914},
	{Domain: "outlook.my", EmailType: "ms_imap", Count: 25828},
	{Domain: "outlook.fr", EmailType: "ms_imap"},
	// 自建邮箱域名
	{Domain: "mail.agentsforge.org", EmailType: "self_built"},
	{Domain: "a1.agentsforge.org", EmailType: "self_built"},
	{Domain: "mails.chatoai.pro", EmailType: "self_built"},
	{Domain: "ak.chatoai.pro", EmailType: "self_built"},
	{Domain: "mails.qubitsforge.org", EmailType: "self_built"},
	{Domain: "ewsbugwih.us.ci", EmailType: "self_built"},
	{Domain: "mdw.ggband.dev", EmailType: "self_built"},
	{Domain: "phw.ggband.dev", EmailType: "self_built"},
	{Domain: "dmw.ggband.dev", EmailType: "self_built"},
	{Domain: "eru.zhanggui.me", EmailType: "self_built"},
	{Domain: "barbararamey.us.ci", EmailType: "self_built"},
	{Domain: "josephdutcher.eu.cc", EmailType: "self_built"},
	{Domain: "jimmykelley.eu.cc", EmailType: "self_built"},
	{Domain: "dorseybarber.eu.cc", EmailType: "self_built"},
	{Domain: "ryanrene.dpdns.org", EmailType: "self_built"},
	{Domain: "ryanrene.qzz.io", EmailType: "self_built"},
	{Domain: "mail2.qq120.ip-ddns.com", EmailType: "self_built"},
	{Domain: "mail3.qq120.ip-ddns.com", EmailType: "self_built"},
	{Domain: "mail4.qq120.ip-ddns.com", EmailType: "self_built"},
	{Domain: "mail1.tc712.cloud-ip.cc", EmailType: "self_built"},
	{Domain: "mail2.tc712.cloud-ip.cc", EmailType: "self_built"},
	{Domain: "mail3.tc712.cloud-ip.cc", EmailType: "self_built"},
	{Domain: "mail1.tc713.abrdns.com", EmailType: "self_built"},
	{Domain: "mail2.tc713.abrdns.com", EmailType: "self_built"},
	{Domain: "mail3.tc713.abrdns.com", EmailType: "self_built"},
	{Domain: "caijiuduolian.bbroot.com", EmailType: "self_built"},
}

// GetDefaultLuckMailDomains 获取内置域名列表
func GetDefaultLuckMailDomains(emailType string) []LuckMailDomainItem {
	if emailType == "" {
		return append([]LuckMailDomainItem(nil), defaultLuckMailDomains...)
	}

	domains := make([]LuckMailDomainItem, 0)
	for _, domain := range defaultLuckMailDomains {
		if domain.EmailType == emailType {
			domains = append(domains, domain)
		}
	}
	return domains
}

// GetBalance 查询余额
func (c *LuckMailClient) GetBalance() (float64, error) {
	respBody, err := c.request("GET", "/api/v1/openapi/balance", "")
	if err != nil {
		return 0, err
	}

	var resp LuckMailResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return 0, fmt.Errorf("解析响应失败: %w", err)
	}
	if resp.Code != 0 {
		return 0, fmt.Errorf("API 错误 (%d): %s", resp.Code, resp.Message)
	}

	var data map[string]interface{}
	json.Unmarshal(resp.Data, &data)

	// 尝试多种方式解析余额
	var balance float64
	if balanceVal, ok := data["balance"]; ok {
		switch v := balanceVal.(type) {
		case float64:
			balance = v
		case string:
			// 字符串转 float64
			if f, err := strconv.ParseFloat(v, 64); err == nil {
				balance = f
			}
		case json.Number:
			if f, err := v.Float64(); err == nil {
				balance = f
			}
		}
	}

	return balance, nil
}

// GetProjects 获取可用项目列表
func (c *LuckMailClient) GetProjects() ([]LuckMailProjectItem, error) {
	respBody, err := c.request("GET", "/api/v1/openapi/projects", "")
	if err != nil {
		return nil, err
	}

	var resp LuckMailResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}
	if resp.Code != 0 {
		return nil, fmt.Errorf("API 错误 (%d): %s", resp.Code, resp.Message)
	}

	var data struct {
		List []LuckMailProjectItem `json:"list"`
	}
	json.Unmarshal(resp.Data, &data)
	return data.List, nil
}

// GetDomains 获取可用域名列表
func (c *LuckMailClient) GetDomains() ([]LuckMailDomainItem, error) {
	respBody, err := c.request("GET", "/api/v1/openapi/domains", "")
	if err != nil {
		return nil, err
	}

	var resp LuckMailResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}
	if resp.Code != 0 {
		return nil, fmt.Errorf("API 错误 (%d): %s", resp.Code, resp.Message)
	}

	var data struct {
		List []LuckMailDomainItem `json:"list"`
	}
	json.Unmarshal(resp.Data, &data)
	return data.List, nil
}

// CreateOrder 创建接码订单
func (c *LuckMailClient) CreateOrder() (*LuckMailOrderData, error) {
	reqData := map[string]interface{}{
		"project_code": c.config.ProjectCode,
	}
	if c.config.EmailType != "" {
		reqData["email_type"] = c.config.EmailType
	}
	if c.config.Domain != "" {
		reqData["domain"] = c.config.Domain
	}

	reqJSON, _ := json.Marshal(reqData)
	respBody, err := c.request("POST", "/api/v1/openapi/order/create", string(reqJSON))
	if err != nil {
		return nil, err
	}

	var resp LuckMailResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}
	if resp.Code != 0 {
		return nil, fmt.Errorf("创建订单失败 (%d): %s", resp.Code, resp.Message)
	}

	var order LuckMailOrderData
	if err := json.Unmarshal(resp.Data, &order); err != nil {
		return nil, fmt.Errorf("解析订单数据失败: %w", err)
	}
	return &order, nil
}

// PollCode 轮询验证码
func (c *LuckMailClient) PollCode(orderNo string) (*LuckMailCodeData, error) {
	path := "/api/v1/openapi/order/" + orderNo + "/code"
	respBody, err := c.request("GET", path, "")
	if err != nil {
		return nil, err
	}

	var resp LuckMailResponse
	if err := json.Unmarshal(respBody, &resp); err != nil {
		return nil, fmt.Errorf("解析响应失败: %w", err)
	}
	if resp.Code != 0 {
		return nil, fmt.Errorf("查询验证码失败 (%d): %s", resp.Code, resp.Message)
	}

	var data LuckMailCodeData
	if err := json.Unmarshal(resp.Data, &data); err != nil {
		return nil, fmt.Errorf("解析验证码数据失败: %w", err)
	}
	return &data, nil
}

// CancelOrder 取消订单
func (c *LuckMailClient) CancelOrder(orderNo string) error {
	path := "/api/v1/openapi/order/" + orderNo + "/cancel"
	respBody, err := c.request("POST", path, "")
	if err != nil {
		return err
	}

	var resp LuckMailResponse
	json.Unmarshal(respBody, &resp)
	if resp.Code != 0 {
		return fmt.Errorf("取消订单失败 (%d): %s", resp.Code, resp.Message)
	}
	return nil
}

// TestConnection 测试连接（通过查询余额验证）
func (c *LuckMailClient) TestConnection() (float64, error) {
	return c.GetBalance()
}

// LuckMailProvider 实现邮箱提供商
type LuckMailProvider struct {
	client  *LuckMailClient
	orderNo string
	address string
}

// NewLuckMailProvider 创建 LuckMail 提供商（创建订单获取邮箱）
func NewLuckMailProvider(config LuckMailConfig) (*LuckMailProvider, error) {
	client := NewLuckMailClient(config)

	// 如果指定了域名，使用内置域名列表进行验证
	if config.Domain != "" {
		domains := GetDefaultLuckMailDomains(config.EmailType)

		if len(domains) > 0 {
			// 验证域名是否在可用列表中
			domainValid := false
			var availableDomains []string

			// 如果指定了 EmailType，只检查该类型的域名
			if config.EmailType != "" {
				for _, d := range domains {
					if d.EmailType == config.EmailType {
						availableDomains = append(availableDomains, d.Domain)
						if d.Domain == config.Domain {
							domainValid = true
						}
					}
				}
			} else {
				// 未指定类型，检查所有域名
				for _, d := range domains {
					availableDomains = append(availableDomains, d.Domain)
					if d.Domain == config.Domain {
						domainValid = true
					}
				}
			}

			if !domainValid {
				// 域名不可用，尝试使用第一个可用域名
				if len(availableDomains) > 0 {
					oldDomain := config.Domain
					config.Domain = availableDomains[0]
					log.Printf("[LuckMail] 域名 %s 不在可用列表中，自动切换到 %s", oldDomain, config.Domain)
				} else {
					return nil, fmt.Errorf("域名 %s 不在可用列表中，且没有其他可用域名", config.Domain)
				}
			}
		}
	}

	order, err := client.CreateOrder()
	if err != nil {
		return nil, fmt.Errorf("创建接码订单失败: %w", err)
	}

	log.Printf("[LuckMail] 订单创建成功: %s, 邮箱: %s, 超时: %ds",
		order.OrderNo, order.EmailAddress, order.TimeoutSeconds)

	return &LuckMailProvider{
		client:  client,
		orderNo: order.OrderNo,
		address: order.EmailAddress,
	}, nil
}

// GetAddress 返回邮箱地址
func (p *LuckMailProvider) GetAddress() string {
	return p.address
}

// WaitForCode 轮询等待验证码
func (p *LuckMailProvider) WaitForCode(timeout, interval int) (string, error) {
	maxRetries := timeout / interval
	log.Printf("[LuckMail] 开始等待验证码, 订单: %s", p.orderNo)

	for attempt := 1; attempt <= maxRetries; attempt++ {
		data, err := p.client.PollCode(p.orderNo)
		if err != nil {
			if attempt%5 == 0 {
				log.Printf("[LuckMail] 查询失败: %v, 重试中...", err)
			}
			time.Sleep(time.Duration(interval) * time.Second)
			continue
		}

		switch data.Status {
		case "success":
			log.Printf("[LuckMail] 验证码获取成功: %s", data.VerificationCode)
			return data.VerificationCode, nil
		case "timeout":
			return "", fmt.Errorf("LuckMail 订单超时")
		case "cancelled":
			return "", fmt.Errorf("LuckMail 订单已取消")
		case "pending":
			if attempt%5 == 0 {
				log.Printf("[LuckMail] [%d/%d] 等待验证码中...", attempt, maxRetries)
			}
		}

		time.Sleep(time.Duration(interval) * time.Second)
	}

	return "", fmt.Errorf("等待验证码超时 (%ds)", timeout)
}

// Cancel 取消订单（任务取消时调用）
func (p *LuckMailProvider) Cancel() {
	if p.orderNo != "" {
		if err := p.client.CancelOrder(p.orderNo); err != nil {
			log.Printf("[LuckMail] 取消订单失败: %v", err)
		} else {
			log.Printf("[LuckMail] 订单已取消: %s", p.orderNo)
		}
	}
}
