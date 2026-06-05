// ===== TempMail.lol 配置管理 =====

console.log('[TempMail.lol] tempmaillol.js 开始加载');

var tempmaillolConfigs = [];

console.log('[TempMail.lol] 全局变量已初始化');

// 加载 TempMail.lol 配置
async function loadTempMailLolConfigs() {
  console.log('[TempMail.lol] loadTempMailLolConfigs 被调用');
  try {
    tempmaillolConfigs = await window.go.main.App.GetTempMailLolConfigs() || [];
    renderTempMailLolInlineList();
    updateTempMailLolSummary();
  } catch(e) {
    console.error('加载 TempMail.lol 配置失败:', e);
  }
}

// 更新 TempMail.lol 配置摘要
function updateTempMailLolSummary() {
  var el = document.getElementById('tempmaillol-summary');
  if (el) {
    el.textContent = tempmaillolConfigs.length > 0 ? tempmaillolConfigs.length + ' 个配置' : '未配置';
  }
}

// 渲染 TempMail.lol 配置列表
function renderTempMailLolInlineList() {
  var listDiv = document.getElementById('tempmaillol-inline-list');
  if (!listDiv) return;

  if (tempmaillolConfigs.length === 0) {
    listDiv.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:20px;">暂无配置</div>';
    return;
  }

  var html = '';
  tempmaillolConfigs.forEach(function(cfg, idx) {
    html += '<div class="moemail-config-item">' +
      '<div class="moemail-config-info">' +
        '<div class="moemail-config-name">' + escapeHtml(cfg.name) + '</div>' +
        '<div class="moemail-config-details">';
    if (cfg.apiKey) {
      html += '<span>API Key: ' + escapeHtml(cfg.apiKey.substring(0, 20)) + '...</span>';
    } else {
      html += '<span>免费层</span>';
    }
    if (cfg.prefix) {
      html += '<span>前缀: ' + escapeHtml(cfg.prefix) + '</span>';
    }
    if (cfg.domain) {
      html += '<span>域名: ' + escapeHtml(cfg.domain) + '</span>';
    }
    html += '</div>' +
      '</div>' +
      '<div class="moemail-config-actions">' +
        '<button onclick="testTempMailLolConfig(' + idx + ')" class="btn btn-secondary btn-sm" style="font-size:11px;padding:3px 8px;">测试</button>' +
        '<button onclick="deleteTempMailLolConfig(' + idx + ')" class="btn btn-danger btn-sm" style="font-size:11px;padding:3px 8px;">删除</button>' +
      '</div>' +
    '</div>';
  });

  listDiv.innerHTML = html;
}

// 内联添加 TempMail.lol 配置
async function inlineAddTempMailLol() {
  console.log('[TempMail.lol] inlineAddTempMailLol called');
  var name = document.getElementById('tempmaillol-inline-name').value.trim();
  var apiKey = document.getElementById('tempmaillol-inline-apikey').value.trim();
  var prefix = document.getElementById('tempmaillol-inline-prefix').value.trim();
  var domain = document.getElementById('tempmaillol-inline-domain').value.trim();

  if (!name) name = 'TempMail.lol-' + (tempmaillolConfigs.length + 1);

  tempmaillolConfigs.push({
    name: name,
    apiKey: apiKey,
    prefix: prefix,
    domain: domain
  });

  var result = await window.go.main.App.SaveTempMailLolConfigs(JSON.stringify(tempmaillolConfigs));
  if (result.error) {
    tempmaillolConfigs.pop();
    showToast(result.error, 'error');
    return;
  }

  document.getElementById('tempmaillol-inline-name').value = '';
  document.getElementById('tempmaillol-inline-apikey').value = '';
  document.getElementById('tempmaillol-inline-prefix').value = '';
  document.getElementById('tempmaillol-inline-domain').value = '';

  renderTempMailLolInlineList();
  updateTempMailLolSummary();
  showToast('TempMail.lol 配置已添加');
}

// 测试 TempMail.lol 连接
async function inlineTestTempMailLol() {
  console.log('[TempMail.lol] inlineTestTempMailLol called');
  var name = document.getElementById('tempmaillol-inline-name').value.trim();
  var apiKey = document.getElementById('tempmaillol-inline-apikey').value.trim();
  var prefix = document.getElementById('tempmaillol-inline-prefix').value.trim();
  var domain = document.getElementById('tempmaillol-inline-domain').value.trim();

  if (!name) name = 'test';

  var btn = document.getElementById('tempmaillol-inline-test-btn');
  var statusEl = document.getElementById('tempmaillol-inline-status');
  btn.disabled = true;
  btn.textContent = '测试中...';
  statusEl.textContent = '';

  try {
    var config = JSON.stringify({
      name: name,
      apiKey: apiKey,
      prefix: prefix,
      domain: domain
    });
    var result = await window.go.main.App.TestTempMailLolConnection(config);
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

// 测试 TempMail.lol 配置
async function testTempMailLolConfig(idx) {
  var cfg = tempmaillolConfigs[idx];
  if (!cfg) return;

  try {
    var result = await window.go.main.App.TestTempMailLolConnection(JSON.stringify(cfg));
    if (result.error) {
      showToast('测试失败: ' + result.error, 'error');
    } else {
      showToast('连接成功', 'success');
    }
    renderTempMailLolInlineList();
  } catch(e) {
    showToast('测试失败: ' + e.message, 'error');
  }
}

// 删除 TempMail.lol 配置
async function deleteTempMailLolConfig(idx) {
  tempmaillolConfigs.splice(idx, 1);
  var result = await window.go.main.App.SaveTempMailLolConfigs(JSON.stringify(tempmaillolConfigs));
  if (result.error) {
    showToast(result.error, 'error');
    await loadTempMailLolConfigs();
    return;
  }
  renderTempMailLolInlineList();
  updateTempMailLolSummary();
  showToast('配置已删除');
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
  console.log('[TempMail.lol] DOMContentLoaded 事件触发');
  console.log('[TempMail.lol] inlineAddTempMailLol 函数存在:', typeof inlineAddTempMailLol);
  console.log('[TempMail.lol] inlineTestTempMailLol 函数存在:', typeof inlineTestTempMailLol);
  loadTempMailLolConfigs();
});

console.log('[TempMail.lol] tempmaillol.js 加载完成');

// 导出到全局
window.inlineAddTempMailLol = inlineAddTempMailLol;
window.inlineTestTempMailLol = inlineTestTempMailLol;
window.testTempMailLolConfig = testTempMailLolConfig;
window.deleteTempMailLolConfig = deleteTempMailLolConfig;
