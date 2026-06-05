// ===== YYDS Mail 配置管理 =====

console.log('[YYDS Mail] yydsmail.js 开始加载');

var yydsmailConfigs = [];

console.log('[YYDS Mail] 全局变量已初始化');

// 加载 YYDS Mail 配置
async function loadYYDSMailConfigs() {
  console.log('[YYDS Mail] loadYYDSMailConfigs 被调用');
  try {
    yydsmailConfigs = await window.go.main.App.GetYYDSMailConfigs() || [];
    renderYYDSMailInlineList();
    updateYYDSMailSummary();
  } catch(e) {
    console.error('加载 YYDS Mail 配置失败:', e);
  }
}

// 更新 YYDS Mail 配置摘要
function updateYYDSMailSummary() {
  var el = document.getElementById('yydsmail-summary');
  if (el) {
    el.textContent = yydsmailConfigs.length > 0 ? yydsmailConfigs.length + ' 个配置' : '未配置';
  }
}

// 渲染 YYDS Mail 配置列表
function renderYYDSMailInlineList() {
  var listDiv = document.getElementById('yydsmail-inline-list');
  if (!listDiv) return;

  if (yydsmailConfigs.length === 0) {
    listDiv.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:20px;">暂无配置</div>';
    return;
  }

  var html = '';
  yydsmailConfigs.forEach(function(cfg, idx) {
    html += '<div class="moemail-config-item">' +
      '<div class="moemail-config-info">' +
        '<div class="moemail-config-name">' + escapeHtml(cfg.name) + '</div>' +
        '<div class="moemail-config-details">' +
          '<span>Token: ' + escapeHtml(cfg.accessToken.substring(0, 20)) + '...</span>';
    if (cfg.domain) {
      html += '<span>域名: ' + escapeHtml(cfg.domain) + '</span>';
    }
    html += '</div>' +
      '</div>' +
      '<div class="moemail-config-actions">' +
        '<button onclick="testYYDSMailConfig(' + idx + ')" class="btn btn-secondary btn-sm" style="font-size:11px;padding:3px 8px;">测试</button>' +
        '<button onclick="deleteYYDSMailConfig(' + idx + ')" class="btn btn-danger btn-sm" style="font-size:11px;padding:3px 8px;">删除</button>' +
      '</div>' +
    '</div>';
  });

  listDiv.innerHTML = html;
}

// 内联添加 YYDS Mail 配置
async function inlineAddYYDSMail() {
  console.log('[YYDS Mail] inlineAddYYDSMail called');
  var name = document.getElementById('yydsmail-inline-name').value.trim();
  var accessToken = document.getElementById('yydsmail-inline-token').value.trim();
  var domain = document.getElementById('yydsmail-inline-domain').value.trim();
  var username = document.getElementById('yydsmail-inline-username').value.trim();

  console.log('[YYDS Mail] accessToken:', accessToken);

  if (!accessToken) { showToast('请输入访问令牌', 'error'); return; }

  if (!name) name = 'YYDS-' + (yydsmailConfigs.length + 1);

  yydsmailConfigs.push({
    name: name,
    accessToken: accessToken,
    domain: domain,
    username: username
  });

  var result = await window.go.main.App.SaveYYDSMailConfigs(JSON.stringify(yydsmailConfigs));
  if (result.error) {
    yydsmailConfigs.pop();
    showToast(result.error, 'error');
    return;
  }

  document.getElementById('yydsmail-inline-name').value = '';
  document.getElementById('yydsmail-inline-token').value = '';
  document.getElementById('yydsmail-inline-domain').value = '';
  document.getElementById('yydsmail-inline-username').value = '';

  renderYYDSMailInlineList();
  updateYYDSMailSummary();
  showToast('YYDS Mail 配置已添加');
}

// 测试 YYDS Mail 连接
async function inlineTestYYDSMail() {
  console.log('[YYDS Mail] inlineTestYYDSMail called');
  var accessToken = document.getElementById('yydsmail-inline-token').value.trim();

  console.log('[YYDS Mail] accessToken:', accessToken);

  if (!accessToken) { showToast('请输入访问令牌', 'error'); return; }

  var btn = document.getElementById('yydsmail-inline-test-btn');
  var statusEl = document.getElementById('yydsmail-inline-status');
  btn.disabled = true;
  btn.textContent = '测试中...';
  statusEl.textContent = '';

  try {
    var config = JSON.stringify({
      name: 'test',
      accessToken: accessToken,
      domain: document.getElementById('yydsmail-inline-domain').value.trim(),
      username: document.getElementById('yydsmail-inline-username').value.trim()
    });
    var result = await window.go.main.App.TestYYDSMailConnection(config);
    if (result.error) {
      statusEl.innerHTML = '<span style="color:var(--danger);">' + escapeHtml(result.error) + '</span>';
    } else {
      statusEl.innerHTML = '<span style="color:var(--success);">连接成功</span>';
    }
  } catch(e) {
    statusEl.innerHTML = '<span style="color:var(--danger);">' + escapeHtml(e.message) + '</span>';
  } finally {
    btn.disabled = false;
    btn.textContent = '测试连接';
  }
}

// 测试 YYDS Mail 配置
async function testYYDSMailConfig(idx) {
  var cfg = yydsmailConfigs[idx];
  if (!cfg) return;

  try {
    var result = await window.go.main.App.TestYYDSMailConnection(JSON.stringify(cfg));
    if (result.error) {
      showToast('测试失败: ' + result.error, 'error');
    } else {
      showToast('连接成功', 'success');
    }
    renderYYDSMailInlineList();
  } catch(e) {
    showToast('测试失败: ' + e.message, 'error');
  }
}

// 删除 YYDS Mail 配置
async function deleteYYDSMailConfig(idx) {
  yydsmailConfigs.splice(idx, 1);
  var result = await window.go.main.App.SaveYYDSMailConfigs(JSON.stringify(yydsmailConfigs));
  if (result.error) {
    showToast(result.error, 'error');
    await loadYYDSMailConfigs();
    return;
  }
  renderYYDSMailInlineList();
  updateYYDSMailSummary();
  showToast('配置已删除');
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('[YYDS Mail] DOMContentLoaded 事件触发');
  console.log('[YYDS Mail] inlineAddYYDSMail 函数存在:', typeof inlineAddYYDSMail);
  console.log('[YYDS Mail] inlineTestYYDSMail 函数存在:', typeof inlineTestYYDSMail);
  loadYYDSMailConfigs();
});

console.log('[YYDS Mail] yydsmail.js 加载完成');

// 导出到全局
window.inlineAddYYDSMail = inlineAddYYDSMail;
window.inlineTestYYDSMail = inlineTestYYDSMail;
window.testYYDSMailConfig = testYYDSMailConfig;
window.deleteYYDSMailConfig = deleteYYDSMailConfig;
