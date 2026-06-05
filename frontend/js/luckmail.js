// ===== LuckMail 配置管理 =====

console.log('[LuckMail] luckmail.js 开始加载');

var luckmailConfigs = [];
var luckmailConfigStatus = {};
var luckmailDomains = []; // 缓存可用域名列表

var defaultLuckMailDomains = [
  // Microsoft Graph 域名
  { domain: 'outlook.com', email_type: 'ms_graph', count: 361802 },
  { domain: 'hotmail.com', email_type: 'ms_graph', count: 133313 },
  { domain: 'outlook.de', email_type: 'ms_graph', count: 3392 },
  { domain: 'outlook.es', email_type: 'ms_graph' },
  // Microsoft IMAP 域名
  { domain: 'hotmail.com', email_type: 'ms_imap', count: 103083 },
  { domain: 'outlook.com', email_type: 'ms_imap', count: 63247 },
  { domain: 'outlook.cl', email_type: 'ms_imap', count: 37914 },
  { domain: 'outlook.my', email_type: 'ms_imap', count: 25828 },
  { domain: 'outlook.fr', email_type: 'ms_imap' },
  // 自建邮箱域名
  { domain: 'mail.agentsforge.org', email_type: 'self_built' },
  { domain: 'a1.agentsforge.org', email_type: 'self_built' },
  { domain: 'mails.chatoai.pro', email_type: 'self_built' },
  { domain: 'ak.chatoai.pro', email_type: 'self_built' },
  { domain: 'mails.qubitsforge.org', email_type: 'self_built' },
  { domain: 'ewsbugwih.us.ci', email_type: 'self_built' },
  { domain: 'mdw.ggband.dev', email_type: 'self_built' },
  { domain: 'phw.ggband.dev', email_type: 'self_built' },
  { domain: 'dmw.ggband.dev', email_type: 'self_built' },
  { domain: 'eru.zhanggui.me', email_type: 'self_built' },
  { domain: 'barbararamey.us.ci', email_type: 'self_built' },
  { domain: 'josephdutcher.eu.cc', email_type: 'self_built' },
  { domain: 'jimmykelley.eu.cc', email_type: 'self_built' },
  { domain: 'dorseybarber.eu.cc', email_type: 'self_built' },
  { domain: 'ryanrene.dpdns.org', email_type: 'self_built' },
  { domain: 'ryanrene.qzz.io', email_type: 'self_built' },
  { domain: 'mail2.qq120.ip-ddns.com', email_type: 'self_built' },
  { domain: 'mail3.qq120.ip-ddns.com', email_type: 'self_built' },
  { domain: 'mail4.qq120.ip-ddns.com', email_type: 'self_built' },
  { domain: 'mail1.tc712.cloud-ip.cc', email_type: 'self_built' },
  { domain: 'mail2.tc712.cloud-ip.cc', email_type: 'self_built' },
  { domain: 'mail3.tc712.cloud-ip.cc', email_type: 'self_built' },
  { domain: 'mail1.tc713.abrdns.com', email_type: 'self_built' },
  { domain: 'mail2.tc713.abrdns.com', email_type: 'self_built' },
  { domain: 'mail3.tc713.abrdns.com', email_type: 'self_built' },
  { domain: 'caijiuduolian.bbroot.com', email_type: 'self_built' }
];

console.log('[LuckMail] 全局变量已初始化');

// 加载 LuckMail 配置
async function loadLuckMailConfigs() {
  console.log('[LuckMail] loadLuckMailConfigs 被调用');
  try {
    luckmailConfigs = await window.go.main.App.GetLuckMailConfigs() || [];
    renderLuckMailInlineList();
    updateLuckMailSummary();
  } catch (e) {
    console.error('加载 LuckMail 配置失败:', e);
  }
}

// 更新摘要
function updateLuckMailSummary() {
  var el = document.getElementById('settings-luckmail-summary');
  if (el) {
    el.textContent = luckmailConfigs.length > 0 ? luckmailConfigs.length + ' 个配置' : '未配置';
  }
}

// 渲染配置列表
function renderLuckMailInlineList() {
  var listDiv = document.getElementById('luckmail-inline-list');
  if (!listDiv) return;

  if (luckmailConfigs.length === 0) {
    listDiv.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:16px;">暂无配置</div>';
    return;
  }

  try {
    var saved = localStorage.getItem('luckmail-config-status');
    if (saved) luckmailConfigStatus = JSON.parse(saved);
  } catch (e) {}

  var html = '';
  luckmailConfigs.forEach(function(cfg, idx) {
    var status = luckmailConfigStatus[cfg.name];
    var statusHtml = '';
    if (status && status.tested) {
      if (status.success) {
        statusHtml = '<span style="color:var(--success);font-size:11px;">余额: ¥' + (status.balance || 0).toFixed(2) + '</span>';
      } else {
        statusHtml = '<span style="color:var(--danger);font-size:11px;">连接失败</span>';
      }
    }

    html += '<div class="moemail-config-item">' +
      '<div class="moemail-config-info">' +
        '<div class="moemail-config-name">' + escapeHtml(cfg.name) + '</div>' +
        '<div class="moemail-config-url">' + escapeHtml(cfg.projectCode) + (cfg.emailType ? ' / ' + escapeHtml(cfg.emailType) : '') + '</div>' +
      '</div>' +
      '<div class="moemail-config-actions">' +
        statusHtml +
        '<button onclick="testLuckMailConfig(' + idx + ')" class="btn btn-secondary btn-sm" style="font-size:11px;padding:3px 8px;">测试</button>' +
        '<button onclick="deleteLuckMailConfig(' + idx + ')" class="btn btn-danger btn-sm" style="font-size:11px;padding:3px 8px;">删除</button>' +
      '</div>' +
    '</div>';
  });

  listDiv.innerHTML = html;
}

// 内联添加 LuckMail 配置
async function inlineAddLuckMail() {
  alert('inlineAddLuckMail 函数被调用了！');
  console.log('[LuckMail] inlineAddLuckMail called');
  var name = document.getElementById('luckmail-inline-name').value.trim();
  var token = document.getElementById('luckmail-inline-token').value.trim();
  var projectCode = document.getElementById('luckmail-inline-project').value.trim();
  var emailType = document.getElementById('luckmail-inline-emailtype').value.trim();
  var domain = document.getElementById('luckmail-inline-domain').value.trim();

  console.log('[LuckMail] token:', token, 'projectCode:', projectCode);

  if (!token) { showToast('请输入接口秘钥', 'error'); return; }
  if (!projectCode) { showToast('请输入项目代码', 'error'); return; }

  // 自动生成名称：包含邮箱类型和域名
  if (!name) {
    var nameParts = ['LuckMail'];
    if (emailType) nameParts.push(emailType);
    if (domain) nameParts.push(domain);
    if (nameParts.length === 1) nameParts.push(luckmailConfigs.length + 1);
    name = nameParts.join('-');
  }

  luckmailConfigs.push({
    name: name,
    token: token,
    projectCode: projectCode,
    emailType: emailType,
    domain: domain
  });

  var result = await window.go.main.App.SaveLuckMailConfigs(JSON.stringify(luckmailConfigs));
  if (result.error) {
    luckmailConfigs.pop();
    showToast(result.error, 'error');
    return;
  }

  // 只清空名称，保留默认值以便快速添加多个配置
  document.getElementById('luckmail-inline-name').value = '';
  // 恢复默认值
  document.getElementById('luckmail-inline-token').value = 'luck_a1209d58721677ccabdd828f0a7912da';
  document.getElementById('luckmail-inline-project').value = 'kiro';
  document.getElementById('luckmail-inline-emailtype').value = 'ms_imap';
  document.getElementById('luckmail-inline-domain').value = '';

  // 重置域名列表，恢复默认状态
  luckmailDomains = [];
  updateLuckMailDomainSelect();

  renderLuckMailInlineList();
  updateLuckMailSummary();
  showToast('LuckMail 配置已添加');

  // 同步更新注册页面的配置列表
  if (typeof loadLuckMailConfigToSelect === 'function') {
    loadLuckMailConfigToSelect();
  }
}

// 测试 LuckMail 连接
async function inlineTestLuckMail() {
  alert('inlineTestLuckMail 函数被调用了！');
  console.log('[LuckMail] inlineTestLuckMail called');
  var token = document.getElementById('luckmail-inline-token').value.trim();
  var projectCode = document.getElementById('luckmail-inline-project').value.trim();

  console.log('[LuckMail] token:', token, 'projectCode:', projectCode);

  if (!token) { showToast('请输入接口秘钥', 'error'); return; }
  if (!projectCode) { showToast('请输入项目代码', 'error'); return; }

  var btn = document.getElementById('luckmail-inline-test-btn');
  var statusEl = document.getElementById('luckmail-inline-status');
  btn.disabled = true;
  btn.textContent = '测试中...';
  statusEl.textContent = '';

  try {
    var config = JSON.stringify({
      name: 'test',
      token: token,
      projectCode: projectCode,
      emailType: document.getElementById('luckmail-inline-emailtype').value.trim(),
      domain: document.getElementById('luckmail-inline-domain').value.trim()
    });
    var result = await window.go.main.App.TestLuckMailConnection(config);
    if (result.error) {
      statusEl.innerHTML = '<span style="color:var(--danger);">' + escapeHtml(result.error) + '</span>';
    } else {
      statusEl.innerHTML = '<span style="color:var(--success);">连接成功, 余额: ¥' + (result.balance || 0).toFixed(2) + '</span>';

      // 更新域名列表
      if (result.domains && result.domains.length > 0) {
        luckmailDomains = result.domains;
        updateLuckMailDomainSelect();
        console.log('[LuckMail] 已更新域名列表:', luckmailDomains.length, '个域名');
      }
    }
  } catch (e) {
    statusEl.innerHTML = '<span style="color:var(--danger);">测试失败: ' + escapeHtml(e.message) + '</span>';
  }

  btn.disabled = false;
  btn.textContent = '测试连接';
}

// 更新域名下拉列表
function updateLuckMailDomainSelect() {
  var domainSelect = document.getElementById('luckmail-inline-domain');
  if (!domainSelect) return;

  var currentValue = domainSelect.value;
  var emailType = document.getElementById('luckmail-inline-emailtype').value.trim();
  var html = '<option value="">自动分配</option>';

  // API 域名优先；未获取到 API 域名时使用内置域名
  var sourceDomains = luckmailDomains.length > 0 ? luckmailDomains : defaultLuckMailDomains;

  // 根据选择的邮箱类型过滤域名
  var filteredDomains = sourceDomains;
  if (emailType) {
    filteredDomains = sourceDomains.filter(function(d) {
      return d.email_type === emailType;
    });
  }

  // 按域名排序（可选：也可以按数量排序）
  filteredDomains.sort(function(a, b) {
    // 如果有数量信息，按数量降序排序
    if (a.count && b.count) {
      return b.count - a.count;
    }
    // 否则按域名字母顺序
    return a.domain.localeCompare(b.domain);
  });

  filteredDomains.forEach(function(d) {
    var label = d.domain;
    // 如果有数量信息，显示数量
    if (d.count) {
      label += ' (' + d.count.toLocaleString() + ' 可用)';
    }
    html += '<option value="' + escapeHtml(d.domain) + '">' + escapeHtml(label) + '</option>';
  });

  domainSelect.innerHTML = html;

  // 尝试恢复之前的选择
  if (currentValue) {
    domainSelect.value = currentValue;
  }

  console.log('[LuckMail] 域名下拉列表已更新，显示', filteredDomains.length, '个域名');
}

// 获取域名列表
async function fetchLuckMailDomains() {
  var token = document.getElementById('luckmail-inline-token').value.trim();
  var projectCode = document.getElementById('luckmail-inline-project').value.trim();

  if (!token || !projectCode) return;

  try {
    var config = JSON.stringify({
      name: 'temp',
      token: token,
      projectCode: projectCode
    });
    var result = await window.go.main.App.GetLuckMailDomains(config);
    if (!result.error && result.domains) {
      luckmailDomains = result.domains;
      updateLuckMailDomainSelect();
      console.log('[LuckMail] 已获取域名列表:', luckmailDomains.length, '个域名');
    }
  } catch (e) {
    console.error('[LuckMail] 获取域名列表失败:', e);
  }
}

// 邮箱类型改变时更新域名列表
function onLuckMailEmailTypeChange() {
  updateLuckMailDomainSelect();
}

// 测试已保存的配置
async function testLuckMailConfig(idx) {
  var cfg = luckmailConfigs[idx];
  if (!cfg) return;

  try {
    var result = await window.go.main.App.TestLuckMailConnection(JSON.stringify(cfg));
    luckmailConfigStatus[cfg.name] = {
      tested: true,
      success: !result.error,
      balance: result.balance || 0
    };
    localStorage.setItem('luckmail-config-status', JSON.stringify(luckmailConfigStatus));
    renderLuckMailInlineList();

    if (result.error) {
      showToast('连接失败: ' + result.error, 'error');
    } else {
      showToast('连接成功, 余额: ¥' + (result.balance || 0).toFixed(2));
    }
  } catch (e) {
    showToast('测试失败: ' + e.message, 'error');
  }
}

// 删除配置
async function deleteLuckMailConfig(idx) {
  luckmailConfigs.splice(idx, 1);
  var result = await window.go.main.App.SaveLuckMailConfigs(JSON.stringify(luckmailConfigs));
  if (result.error) {
    showToast(result.error, 'error');
    await loadLuckMailConfigs();
    return;
  }
  renderLuckMailInlineList();
  updateLuckMailSummary();
  showToast('配置已删除');

  // 同步更新注册页面的配置列表
  if (typeof loadLuckMailConfigToSelect === 'function') {
    loadLuckMailConfigToSelect();
  }
}

// 页面加载时初始化
window.addEventListener('DOMContentLoaded', function() {
  console.log('[LuckMail] DOMContentLoaded 事件触发');
  console.log('[LuckMail] inlineAddLuckMail 函数存在:', typeof inlineAddLuckMail);
  console.log('[LuckMail] inlineTestLuckMail 函数存在:', typeof inlineTestLuckMail);
  loadLuckMailConfigs();
  updateLuckMailDomainSelect();
});

console.log('[LuckMail] luckmail.js 加载完成');

// 将函数暴露到全局作用域（确保 onclick 可以访问）
window.inlineAddLuckMail = inlineAddLuckMail;
window.inlineTestLuckMail = inlineTestLuckMail;
window.testLuckMailConfig = testLuckMailConfig;
window.deleteLuckMailConfig = deleteLuckMailConfig;
window.fetchLuckMailDomains = fetchLuckMailDomains;
window.onLuckMailEmailTypeChange = onLuckMailEmailTypeChange;

console.log('[LuckMail] 函数已暴露到 window 对象');
