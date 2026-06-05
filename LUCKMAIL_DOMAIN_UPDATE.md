# LuckMail 域名自动更新功能

## 功能概述

为 LuckMail 邮箱服务添加了域名自动更新功能，支持从 API 获取可用域名列表，并在指定域名不可用时自动切换到可用域名。

## 实现细节

### 后端改动

#### 1. 新增数据结构 (`internal/email/luckmail.go`)

```go
// LuckMailDomainItem 域名列表项
type LuckMailDomainItem struct {
    Domain    string `json:"domain"`
    EmailType string `json:"email_type"`
}
```

#### 2. 新增 API 方法

**获取域名列表** (`internal/email/luckmail.go:180-198`)
```go
func (c *LuckMailClient) GetDomains() ([]LuckMailDomainItem, error)
```
- 调用 `/api/v1/openapi/domains` 接口
- 返回可用域名列表，包含域名和对应的邮箱类型

**管理器方法** (`internal/email/manager_luckmail.go:90-110`)
```go
func GetLuckMailDomains(configJSON string) map[string]interface{}
```
- 封装域名获取逻辑，供前端调用

#### 3. 域名自动切换逻辑 (`internal/email/luckmail.go:265-305`)

在 `NewLuckMailProvider` 中添加：
- 如果配置中指定了域名，先获取可用域名列表
- 验证指定域名是否在可用列表中
- 如果指定了 `EmailType`，只检查该类型的域名
- 域名不可用时，自动切换到第一个可用域名
- 记录切换日志

#### 4. 测试连接增强 (`internal/email/manager_luckmail.go:65-88`)

`TestLuckMailConnection` 现在返回：
- 账户余额
- 项目列表
- **域名列表**（新增）

### 前端改动

#### 1. 全局变量 (`frontend/js/luckmail.js:6`)

```javascript
var luckmailDomains = []; // 缓存可用域名列表
```

#### 2. 域名列表更新函数

**updateLuckMailDomainSelect** (`frontend/js/luckmail.js:160-185`)
- 根据选择的邮箱类型过滤域名
- 动态更新域名下拉列表
- 保留用户之前的选择

**fetchLuckMailDomains** (`frontend/js/luckmail.js:188-204`)
- 独立获取域名列表
- 更新缓存和下拉列表

**onLuckMailEmailTypeChange** (`frontend/js/luckmail.js:207-209`)
- 邮箱类型改变时触发
- 自动过滤并更新域名列表

#### 3. 测试连接增强 (`frontend/js/luckmail.js:117-155`)

测试连接成功后：
- 自动获取并缓存域名列表
- 更新域名下拉列表

#### 4. HTML 事件绑定 (`frontend/index.html:727`)

```html
<select id="luckmail-inline-emailtype" class="form-input" onchange="onLuckMailEmailTypeChange()">
```

### 应用层改动 (`app.go`)

新增导出方法：
```go
func (a *App) GetLuckMailDomains(configJSON string) map[string]interface{}
```

## 使用流程

### 用户操作流程

1. **输入配置**
   - 输入接口秘钥（Token）
   - 输入项目代码（Project Code）

2. **测试连接**
   - 点击"测试连接"按钮
   - 系统验证连接并获取域名列表
   - 域名下拉列表自动更新为可用域名

3. **选择邮箱类型**（可选）
   - 选择邮箱类型（ms_imap/ms_graph/google_variant/self_built）
   - 域名列表自动过滤，只显示该类型的可用域名

4. **选择域名**（可选）
   - 从下拉列表选择域名
   - 或选择"自动分配"让系统自动选择

5. **保存配置**
   - 点击"添加配置"保存

### 自动切换机制

当创建邮箱订单时：
1. 如果指定了域名，系统会验证该域名是否可用
2. 如果域名不可用：
   - 自动切换到第一个可用域名
   - 记录日志：`[LuckMail] 域名 xxx 不可用，自动切换到 yyy`
3. 如果没有可用域名，返回错误

## API 接口

### 获取域名列表

**端点**: `/api/v1/openapi/domains`  
**方法**: GET  
**认证**: X-API-Key, X-Timestamp, X-Signature

**响应格式**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "domain": "hotmail.com",
        "email_type": "ms_imap"
      },
      {
        "domain": "outlook.com",
        "email_type": "ms_graph"
      }
    ]
  }
}
```

## 优势

1. **实时性**: 从 API 实时获取可用域名，避免硬编码
2. **容错性**: 域名不可用时自动切换，提高成功率
3. **用户体验**: 
   - 自动过滤域名列表
   - 减少手动配置错误
   - 提供清晰的反馈
4. **可维护性**: 域名列表由服务端管理，无需更新客户端

## 兼容性

- 向后兼容：如果 API 不支持域名列表接口，会降级到直接使用指定域名
- 可选功能：域名和邮箱类型都是可选参数，不影响现有功能

## 日志示例

```
[LuckMail] 警告：无法获取域名列表: API 错误 (404): Not Found，尝试直接使用指定域名
[LuckMail] 域名 old-domain.com 不可用，自动切换到 hotmail.com
[LuckMail] 订单创建成功: ORDER123, 邮箱: test@hotmail.com, 超时: 300s
```

## 测试建议

1. 测试正常流程：配置 -> 测试连接 -> 查看域名列表更新
2. 测试类型过滤：切换邮箱类型，验证域名列表过滤
3. 测试自动切换：指定不可用域名，验证自动切换逻辑
4. 测试降级：模拟 API 不可用，验证降级行为
