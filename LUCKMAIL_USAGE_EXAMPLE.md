# LuckMail 域名自动更新使用示例

## 快速开始

### 1. 基本配置

```javascript
// 配置信息
const config = {
  name: "我的LuckMail配置",
  token: "your-api-token-here",
  projectCode: "kiro",
  emailType: "ms_imap",  // 可选：ms_imap, ms_graph, google_variant, self_built
  domain: "hotmail.com"   // 可选：指定域名
};
```

### 2. 测试连接并获取域名列表

```javascript
// 测试连接
const result = await window.go.main.App.TestLuckMailConnection(JSON.stringify(config));

if (result.error) {
  console.error("连接失败:", result.error);
} else {
  console.log("余额:", result.balance);
  console.log("项目列表:", result.projects);
  console.log("可用域名:", result.domains);
  // domains 格式: [{ domain: "hotmail.com", email_type: "ms_imap" }, ...]
}
```

### 3. 获取域名列表（独立接口）

```javascript
const domainResult = await window.go.main.App.GetLuckMailDomains(JSON.stringify({
  token: "your-api-token",
  projectCode: "kiro"
}));

if (!domainResult.error) {
  const domains = domainResult.domains;
  // 按邮箱类型分组
  const domainsByType = {};
  domains.forEach(d => {
    if (!domainsByType[d.email_type]) {
      domainsByType[d.email_type] = [];
    }
    domainsByType[d.email_type].push(d.domain);
  });
  console.log("域名分组:", domainsByType);
}
```

## 使用场景

### 场景 1: 自动分配域名

```javascript
// 不指定域名，让系统自动分配
const config = {
  name: "自动分配",
  token: "your-token",
  projectCode: "kiro",
  emailType: "ms_imap"  // 只指定类型
  // domain 留空
};

// 系统会自动选择该类型的第一个可用域名
```

### 场景 2: 指定域名（带自动切换）

```javascript
// 指定域名，如果不可用会自动切换
const config = {
  name: "指定域名",
  token: "your-token",
  projectCode: "kiro",
  emailType: "ms_imap",
  domain: "hotmail.com"  // 如果不可用，自动切换到其他可用域名
};

// 后端日志会显示：
// [LuckMail] 域名 hotmail.com 不可用，自动切换到 outlook.com
```

### 场景 3: 动态更新域名列表

```javascript
// 用户选择邮箱类型时，动态过滤域名
function onEmailTypeChange(emailType) {
  const allDomains = luckmailDomains; // 全局缓存的域名列表
  
  // 过滤域名
  const filteredDomains = emailType 
    ? allDomains.filter(d => d.email_type === emailType)
    : allDomains;
  
  // 更新 UI
  updateDomainSelect(filteredDomains);
}
```

## 前端集成示例

### HTML

```html
<!-- 邮箱类型选择 -->
<select id="email-type" onchange="onEmailTypeChange()">
  <option value="">自动分配</option>
  <option value="ms_imap">微软 IMAP</option>
  <option value="ms_graph">微软 Graph</option>
  <option value="google_variant">谷歌变体</option>
  <option value="self_built">自建域名</option>
</select>

<!-- 域名选择 -->
<select id="domain">
  <option value="">自动分配</option>
  <!-- 动态填充 -->
</select>

<!-- 测试按钮 -->
<button onclick="testConnection()">测试连接</button>
```

### JavaScript

```javascript
let cachedDomains = [];

// 测试连接
async function testConnection() {
  const token = document.getElementById('token').value;
  const projectCode = document.getElementById('project-code').value;
  
  const config = {
    name: 'test',
    token: token,
    projectCode: projectCode
  };
  
  const result = await window.go.main.App.TestLuckMailConnection(
    JSON.stringify(config)
  );
  
  if (result.error) {
    alert('连接失败: ' + result.error);
    return;
  }
  
  alert('连接成功！余额: ¥' + result.balance.toFixed(2));
  
  // 缓存域名列表
  if (result.domains) {
    cachedDomains = result.domains;
    updateDomainSelect();
  }
}

// 更新域名下拉列表
function updateDomainSelect() {
  const emailType = document.getElementById('email-type').value;
  const domainSelect = document.getElementById('domain');
  
  // 过滤域名
  const filtered = emailType
    ? cachedDomains.filter(d => d.email_type === emailType)
    : cachedDomains;
  
  // 生成选项
  let html = '<option value="">自动分配</option>';
  filtered.forEach(d => {
    html += `<option value="${d.domain}">${d.domain} (${d.email_type})</option>`;
  });
  
  domainSelect.innerHTML = html;
}

// 邮箱类型改变
function onEmailTypeChange() {
  updateDomainSelect();
}
```

## API 响应示例

### TestLuckMailConnection 响应

```json
{
  "success": true,
  "balance": 98.50,
  "projects": [
    "kiro (Kiro项目)",
    "test (测试项目)"
  ],
  "domains": [
    {
      "domain": "hotmail.com",
      "email_type": "ms_imap"
    },
    {
      "domain": "outlook.com",
      "email_type": "ms_graph"
    },
    {
      "domain": "gmail.com",
      "email_type": "google_variant"
    }
  ]
}
```

### GetLuckMailDomains 响应

```json
{
  "success": true,
  "domains": [
    {
      "domain": "hotmail.com",
      "email_type": "ms_imap"
    },
    {
      "domain": "outlook.com",
      "email_type": "ms_imap"
    },
    {
      "domain": "live.com",
      "email_type": "ms_graph"
    }
  ]
}
```

## 错误处理

### 连接失败

```javascript
const result = await window.go.main.App.TestLuckMailConnection(config);
if (result.error) {
  // 可能的错误：
  // - "配置格式错误: ..."
  // - "连接失败: API 错误 (401): Unauthorized"
  // - "连接失败: 请求失败: timeout"
  console.error(result.error);
}
```

### 域名不可用

```javascript
// 后端会自动处理，前端无需特殊处理
// 日志会显示切换信息
```

### API 不支持域名列表

```javascript
// 后端会降级处理，使用指定的域名
// 日志: [LuckMail] 警告：无法获取域名列表: API 错误 (404): Not Found，尝试直接使用指定域名
```

## 最佳实践

1. **缓存域名列表**: 测试连接成功后缓存域名列表，避免重复请求
2. **类型过滤**: 根据邮箱类型动态过滤域名，提升用户体验
3. **错误提示**: 清晰地展示错误信息，帮助用户排查问题
4. **自动切换**: 利用后端的自动切换功能，提高成功率
5. **日志监控**: 关注后端日志，了解域名切换情况

## 注意事项

1. 域名列表是实时从 API 获取的，可能会变化
2. 邮箱类型和域名都是可选参数
3. 如果不指定域名，系统会自动分配
4. 域名自动切换只在创建订单时触发
5. API 不支持域名列表时会降级到直接使用指定域名
