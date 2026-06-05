# LuckMail 域名配置快速参考

## 微软 IMAP (ms_imap) 域名列表

| 域名 | 可用数量 | 优先级 | 地区 |
|------|---------|--------|------|
| hotmail.com | 103,083 | ⭐⭐⭐⭐⭐ | 全球 |
| outlook.com | 63,247 | ⭐⭐⭐⭐ | 全球 |
| outlook.cl | 37,914 | ⭐⭐⭐ | 智利 |
| outlook.my | 25,828 | ⭐⭐ | 马来西亚 |
| outlook.fr | - | ⭐ | 法国 |

## 其他邮箱类型

### 微软 Graph (ms_graph)
- live.com
- outlook.com
- hotmail.com

### 谷歌变体 (google_variant)
- gmail.com
- googlemail.com

### 自建域名 (self_built)
- 根据项目配置的自定义域名

## 推荐配置

### 最佳实践
```javascript
{
  emailType: "ms_imap",
  domain: ""  // 留空，自动分配最优域名（hotmail.com）
}
```

### 指定地区
```javascript
{
  emailType: "ms_imap",
  domain: "outlook.cl"  // 智利地区
}
```

### 备用方案
```javascript
{
  emailType: "ms_imap",
  domain: "outlook.my"  // 如果主域名不可用，系统会自动切换
}
```

## 前端显示效果

```
域名下拉列表（选择 ms_imap 后）：
┌─────────────────────────────────┐
│ 自动分配                         │
│ hotmail.com (103,083 可用)      │ ← 推荐
│ outlook.com (63,247 可用)       │
│ outlook.cl (37,914 可用)        │
│ outlook.my (25,828 可用)        │
│ outlook.fr                      │
└─────────────────────────────────┘
```

## 自动切换示例

```
用户配置: outlook.fr
系统检测: 该域名暂时不可用
自动切换: hotmail.com (可用数量最多)
日志输出: [LuckMail] 域名 outlook.fr 不可用，自动切换到 hotmail.com
```

## API 调用示例

### 获取域名列表
```javascript
const result = await window.go.main.App.GetLuckMailDomains(JSON.stringify({
  token: "your-token",
  projectCode: "kiro"
}));

console.log(result.domains);
// [
//   { domain: "hotmail.com", email_type: "ms_imap", count: 103083 },
//   { domain: "outlook.com", email_type: "ms_imap", count: 63247 },
//   ...
// ]
```

### 测试连接（包含域名列表）
```javascript
const result = await window.go.main.App.TestLuckMailConnection(JSON.stringify({
  name: "test",
  token: "your-token",
  projectCode: "kiro",
  emailType: "ms_imap"
}));

console.log("余额:", result.balance);
console.log("域名:", result.domains);
```

## 常见问题

### Q: 为什么有些域名没有显示数量？
A: API 可能没有返回该域名的可用数量信息，这不影响使用。

### Q: 域名列表会更新吗？
A: 是的，每次测试连接时都会从 API 获取最新的域名列表。

### Q: 如何选择最佳域名？
A: 
1. 优先选择可用数量多的域名（如 hotmail.com）
2. 或者选择"自动分配"，让系统自动选择
3. 如果有地区偏好，可以选择特定地区的域名

### Q: 域名不可用会怎样？
A: 系统会自动切换到该类型的第一个可用域名，并记录日志。

### Q: 可以混用不同类型的域名吗？
A: 不建议。每个域名都有对应的邮箱类型，应该匹配使用。

## 性能优化建议

1. **缓存域名列表**：测试连接后缓存结果，避免重复请求
2. **预加载**：页面加载时可以预先获取域名列表
3. **本地排序**：在前端进行排序和过滤，减少服务器压力

## 更新日志

- **v1.0.0**: 初始版本，支持基本域名配置
- **v1.1.0**: 新增域名自动更新功能
- **v1.2.0**: 新增多域名支持和智能排序
- **v1.2.1**: 新增可用数量显示
