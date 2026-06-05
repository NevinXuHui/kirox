# LuckMail 多域名支持说明

## 概述

LuckMail 的同一邮箱类型（如 ms_imap）支持多个不同的域名后缀，系统已完整支持这一特性。

## 微软 IMAP 域名示例

根据实际数据，ms_imap 类型包含以下域名：

| 域名 | 可用数量 | 说明 |
|------|---------|------|
| hotmail.com | 103,083 | 最常用 |
| outlook.com | 63,247 | 次常用 |
| outlook.cl | 37,914 | 智利地区 |
| outlook.my | 25,828 | 马来西亚地区 |
| outlook.fr | - | 法国地区 |

## 功能特性

### 1. 自动获取所有域名

测试连接时，系统会获取该邮箱类型的所有可用域名：

```javascript
// API 返回示例
{
  "success": true,
  "domains": [
    { "domain": "hotmail.com", "email_type": "ms_imap", "count": 103083 },
    { "domain": "outlook.com", "email_type": "ms_imap", "count": 63247 },
    { "domain": "outlook.cl", "email_type": "ms_imap", "count": 37914 },
    { "domain": "outlook.my", "email_type": "ms_imap", "count": 25828 },
    { "domain": "outlook.fr", "email_type": "ms_imap" }
  ]
}
```

### 2. 智能排序显示

域名列表按以下规则排序：
1. **优先按可用数量降序**（如果 API 返回了数量信息）
2. **其次按域名字母顺序**

显示效果：
```
自动分配
hotmail.com (103,083 可用)
outlook.com (63,247 可用)
outlook.cl (37,914 可用)
outlook.my (25,828 可用)
outlook.fr
```

### 3. 类型过滤

选择邮箱类型后，只显示该类型的域名：

```javascript
// 选择 ms_imap 时
filteredDomains = allDomains.filter(d => d.email_type === 'ms_imap');
// 结果：显示所有 5 个微软 IMAP 域名

// 选择 ms_graph 时
filteredDomains = allDomains.filter(d => d.email_type === 'ms_graph');
// 结果：显示微软 Graph 相关域名

// 未选择类型时
filteredDomains = allDomains;
// 结果：显示所有域名
```

### 4. 自动切换机制

创建订单时的域名选择逻辑：

```go
// 场景 1: 用户指定了可用域名
config.Domain = "hotmail.com"  // 直接使用

// 场景 2: 用户指定的域名不可用
config.Domain = "unavailable.com"
// 系统自动切换到第一个可用域名（按数量排序后的第一个）
// 日志: [LuckMail] 域名 unavailable.com 不可用，自动切换到 hotmail.com

// 场景 3: 用户未指定域名
config.Domain = ""  // API 自动分配最优域名
```

## 前端实现细节

### 域名列表更新函数

```javascript
function updateLuckMailDomainSelect() {
  var emailType = document.getElementById('luckmail-inline-emailtype').value.trim();
  
  // 1. 过滤域名
  var filteredDomains = emailType
    ? luckmailDomains.filter(d => d.email_type === emailType)
    : luckmailDomains;
  
  // 2. 排序（数量优先）
  filteredDomains.sort(function(a, b) {
    if (a.count && b.count) {
      return b.count - a.count;  // 降序
    }
    return a.domain.localeCompare(b.domain);
  });
  
  // 3. 生成选项
  var html = '<option value="">自动分配</option>';
  filteredDomains.forEach(function(d) {
    var label = d.domain;
    if (d.count) {
      label += ' (' + d.count.toLocaleString() + ' 可用)';
    }
    html += '<option value="' + d.domain + '">' + label + '</option>';
  });
  
  domainSelect.innerHTML = html;
}
```

### 邮箱类型改变事件

```javascript
// HTML
<select id="luckmail-inline-emailtype" onchange="onLuckMailEmailTypeChange()">
  <option value="">自动分配</option>
  <option value="ms_imap">ms_imap (微软IMAP)</option>
  <option value="ms_graph">ms_graph (微软Graph)</option>
  <option value="google_variant">google_variant (谷歌变体)</option>
  <option value="self_built">self_built (自建域名)</option>
</select>

// JavaScript
function onLuckMailEmailTypeChange() {
  updateLuckMailDomainSelect();  // 自动过滤并更新域名列表
}
```

## 后端实现细节

### 数据结构

```go
type LuckMailDomainItem struct {
    Domain    string `json:"domain"`
    EmailType string `json:"email_type"`
    Count     int    `json:"count,omitempty"` // 可用数量（可选）
}
```

### 域名验证与切换

```go
func NewLuckMailProvider(config LuckMailConfig) (*LuckMailProvider, error) {
    client := NewLuckMailClient(config)

    if config.Domain != "" {
        domains, err := client.GetDomains()
        if err != nil {
            log.Printf("[LuckMail] 警告：无法获取域名列表: %v，尝试直接使用指定域名", err)
        } else {
            // 收集可用域名
            var availableDomains []string
            domainValid := false

            if config.EmailType != "" {
                // 只检查指定类型的域名
                for _, d := range domains {
                    if d.EmailType == config.EmailType {
                        availableDomains = append(availableDomains, d.Domain)
                        if d.Domain == config.Domain {
                            domainValid = true
                        }
                    }
                }
            } else {
                // 检查所有域名
                for _, d := range domains {
                    availableDomains = append(availableDomains, d.Domain)
                    if d.Domain == config.Domain {
                        domainValid = true
                    }
                }
            }

            // 自动切换
            if !domainValid && len(availableDomains) > 0 {
                oldDomain := config.Domain
                config.Domain = availableDomains[0]
                log.Printf("[LuckMail] 域名 %s 不可用，自动切换到 %s", oldDomain, config.Domain)
            }
        }
    }

    // 创建订单...
}
```

## 使用场景

### 场景 1: 选择特定域名

```javascript
// 用户操作流程
1. 输入 Token 和项目代码
2. 点击"测试连接" → 获取所有可用域名
3. 选择邮箱类型 "ms_imap" → 显示 5 个微软域名
4. 从下拉列表选择 "outlook.cl (37,914 可用)"
5. 点击"添加配置"

// 结果
创建订单时使用 outlook.cl 域名
```

### 场景 2: 自动分配

```javascript
// 用户操作流程
1. 输入 Token 和项目代码
2. 选择邮箱类型 "ms_imap"
3. 域名选择 "自动分配"
4. 点击"添加配置"

// 结果
系统自动选择可用数量最多的域名（hotmail.com）
```

### 场景 3: 域名不可用时自动切换

```javascript
// 配置
{
  emailType: "ms_imap",
  domain: "outlook.fr"  // 假设此域名暂时不可用
}

// 系统行为
1. 获取 ms_imap 类型的所有域名
2. 发现 outlook.fr 不在可用列表中
3. 自动切换到 hotmail.com（第一个可用域名）
4. 记录日志：[LuckMail] 域名 outlook.fr 不可用，自动切换到 hotmail.com
```

## 优势

### 1. 灵活性
- 支持同一类型的多个域名
- 用户可以根据需求选择特定地区的域名

### 2. 可靠性
- 域名不可用时自动切换
- 优先使用可用数量多的域名

### 3. 用户体验
- 显示可用数量，帮助用户做出选择
- 自动排序，优先显示最佳选项
- 类型过滤，减少选择干扰

### 4. 可维护性
- 域名列表由 API 动态提供
- 无需硬编码域名列表
- 新增域名自动支持

## 数据格式

### API 请求

```http
GET /api/v1/openapi/domains
Headers:
  X-API-Key: your-token
  X-Timestamp: 1234567890
  X-Signature: hmac-sha256-signature
```

### API 响应

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "domain": "hotmail.com",
        "email_type": "ms_imap",
        "count": 103083
      },
      {
        "domain": "outlook.com",
        "email_type": "ms_imap",
        "count": 63247
      },
      {
        "domain": "outlook.cl",
        "email_type": "ms_imap",
        "count": 37914
      },
      {
        "domain": "outlook.my",
        "email_type": "ms_imap",
        "count": 25828
      },
      {
        "domain": "outlook.fr",
        "email_type": "ms_imap"
      }
    ]
  }
}
```

## 注意事项

1. **数量信息是可选的**：如果 API 不返回 count 字段，系统会按字母顺序排序
2. **实时性**：域名列表和数量是实时从 API 获取的，可能会变化
3. **类型匹配**：自动切换时会优先匹配相同 email_type 的域名
4. **降级处理**：如果无法获取域名列表，会直接使用用户指定的域名

## 测试建议

1. **测试多域名显示**
   - 测试连接后检查域名下拉列表
   - 验证是否显示所有 5 个微软域名

2. **测试排序**
   - 验证域名按数量降序排列
   - 验证 hotmail.com 排在第一位

3. **测试过滤**
   - 切换邮箱类型
   - 验证域名列表正确过滤

4. **测试自动切换**
   - 指定一个不存在的域名
   - 验证系统自动切换到可用域名
   - 检查日志输出

5. **测试数量显示**
   - 验证域名选项显示格式：`hotmail.com (103,083 可用)`
   - 验证数字格式化（千位分隔符）
