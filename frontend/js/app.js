// ===== 核心：导航 / 标签页 / 下拉框 / 配置 / 卡密 / Toast / 窗口控制 =====

// 页面切换
var pageTitles = { overview: '概览', logs: '运行日志', register: '注册', accounts: '邮箱池', subscription: '获取订阅支付链接', info: '关于', settings: '设置' };
function switchPage(pageId) {
  document.querySelectorAll('.page, .page-placeholder, .page-iframe').forEach(function(p) {
    p.classList.remove('active');
  });
  var target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item[data-page]').forEach(function(item) {
    item.classList.toggle('active', item.getAttribute('data-page') === pageId);
  });
  document.getElementById('titlebar-text').textContent = pageTitles[pageId] || pageId;
  if (pageId === 'overview') {
    startOverviewTimer();
  } else {
    stopOverviewTimer();
  }
  if (pageId === 'accounts') {
    loadOutlookAccountsList();
    startOutlookAutoRefresh();
  } else {
    stopOutlookAutoRefresh();
  }
  if (pageId === 'info') {
    loadInfoVersion();
  }
  if (pageId === 'subscription') {
    reloadSubscriptionAccounts();
  }
}

// 标签页切换
function switchTab(tabId) {
  var tabBar = document.querySelector('.tab-item[data-tab="' + tabId + '"]').parentElement;
  tabBar.querySelectorAll('.tab-item').forEach(function(t) {
    t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
  });
  var page = tabBar.parentElement;
  page.querySelectorAll('.tab-panel').forEach(function(p) {
    p.classList.remove('active');
  });
  var target = document.getElementById('tab-' + tabId);
  if (target) target.classList.add('active');
}

// 下拉框
function toggleDropdown(id) {
  var dropdown = document.getElementById(id);
  var selected = dropdown.querySelector('.dropdown-selected');
  var options = dropdown.querySelector('.dropdown-options');
  document.querySelectorAll('.dropdown-options.show').forEach(function(el) {
    if (el !== options) {
      el.classList.remove('show');
      el.parentElement.querySelector('.dropdown-selected').classList.remove('active');
    }
  });
  selected.classList.toggle('active');
  options.classList.toggle('show');
}

document.addEventListener('click', function(e) {
  if (!e.target.closest('.custom-dropdown')) {
    document.querySelectorAll('.dropdown-options.show').forEach(function(el) {
      el.classList.remove('show');
      el.parentElement.querySelector('.dropdown-selected').classList.remove('active');
    });
  }
});

async function loadInfoVersion() {
  try {
    var data = await window.go.main.App.GetOverview();
    var ver = (data && data.version) ? data.version : '';
    if (ver) {
      ['info-version-detail', 'info-version-detail2'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.textContent = ver;
      });
    }
  } catch(e) {}

  // 从 GitHub 加载最新 release 信息
  var changelogEl = document.getElementById('info-changelog');
  var latestEl = document.getElementById('info-latest-version');
  var dateEl = document.getElementById('info-release-date');
  var tagEl = document.getElementById('info-changelog-version');
  if (changelogEl) changelogEl.innerHTML = '<span style="color:var(--text-muted);">加载中...</span>';
  try {
    var result = await window.go.main.App.CheckUpdate();
    if (result.error) {
      if (changelogEl) changelogEl.innerHTML = '<span style="color:var(--text-muted);">加载失败: ' + result.error + '</span>';
      return;
    }
    if (latestEl) {
      latestEl.textContent = result.latestVersion || '-';
      latestEl.style.color = result.hasUpdate ? 'var(--success)' : 'var(--text)';
    }
    if (dateEl) dateEl.textContent = result.releaseDate || '-';
    if (tagEl) tagEl.textContent = result.latestVersion || '-';
    var banner = document.getElementById('info-update-banner');
    var bannerVer = document.getElementById('info-banner-version');
    if (banner) banner.style.display = result.hasUpdate ? 'block' : 'none';
    if (bannerVer) bannerVer.textContent = result.latestVersion || '';
    if (changelogEl) {
      var body = (result.changelog || '').trim();
      changelogEl.innerHTML = body ? renderChangelog(body) : '<span style="color:var(--text-muted);">暂无更新说明</span>';
    }
  } catch(e) {
    if (changelogEl) changelogEl.innerHTML = '<span style="color:var(--text-muted);">加载失败</span>';
  }
}

// 存储目录设置
async function loadDataDir() {
  try {
    var dir = await window.go.main.App.GetDataDir();
    document.getElementById('cfg-data-dir').value = dir || '';
  } catch(e) {}
}

async function selectDataDir() {
  try {
    var path = await window.go.main.App.SelectDirectory();
    if (!path) return;
    var result = await window.go.main.App.SetDataDir(path);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    document.getElementById('cfg-data-dir').value = result.path;
    showToast('存储目录已更新，重启后完全生效');
  } catch(e) {
    showToast('设置失败: ' + e.message, 'error');
  }
}

async function resetDataDir() {
  try {
    var result = await window.go.main.App.ResetDataDir();
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    document.getElementById('cfg-data-dir').value = result.path;
    showToast('已恢复默认存储目录');
  } catch(e) {
    showToast('重置失败: ' + e.message, 'error');
  }
}

// 注册结果输出目录设置
async function loadResultOutputDir() {
  try {
    var dir = await window.go.main.App.GetResultOutputDir();
    var el = document.getElementById('cfg-result-output-dir');
    if (el) el.value = dir || '';
  } catch(e) {}
}

async function selectResultOutputDir() {
  try {
    var path = await window.go.main.App.SelectDirectory();
    if (!path) return;
    var result = await window.go.main.App.SetResultOutputDir(path);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    document.getElementById('cfg-result-output-dir').value = result.path;
    showToast('注册结果将写入: ' + result.path);
  } catch(e) {
    showToast('设置失败: ' + e.message, 'error');
  }
}

async function resetResultOutputDir() {
  try {
    var result = await window.go.main.App.ResetResultOutputDir();
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    document.getElementById('cfg-result-output-dir').value = result.path;
    showToast('已恢复默认输出目录');
  } catch(e) {
    showToast('重置失败: ' + e.message, 'error');
  }
}

// 代理设置
async function loadProxy() {
  try {
    var p = await window.go.main.App.GetProxy();
    var el = document.getElementById('cfg-proxy');
    if (el) el.value = p || '';
  } catch(e) {}
}

async function loadProxyPool() {
  try {
    var proxies = await window.go.main.App.GetProxyPool();
    var el = document.getElementById('cfg-proxy-pool');
    if (el && proxies && proxies.length > 0) {
      el.value = proxies.join('\n');
    }
  } catch(e) {}
}

function renderProxyDetectCard(state, payload) {
  var box = document.getElementById('proxy-detect-card');
  if (!box) return;
  if (state === 'hidden') { box.style.display = 'none'; box.innerHTML = ''; return; }
  box.style.display = 'block';
  var base = 'border:1px solid var(--border);border-radius:8px;padding:10px 12px;font-size:12px;';
  if (state === 'loading') {
    box.style.cssText = base + 'background:var(--card-bg, transparent);color:var(--muted);';
    box.innerHTML = '正在检测代理出口…';
    return;
  }
  if (state === 'ok') {
    var loc = [payload.country, payload.region, payload.city].filter(Boolean).join(' · ');
    box.style.cssText = base + 'background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.35);';
    box.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
        '<span style="font-weight:600;color:#10b981;">✓ 可用</span>' +
        '<span style="padding:1px 6px;border-radius:4px;background:rgba(16,185,129,0.15);color:#10b981;font-size:11px;font-weight:600;">' + (payload.scheme || '').toUpperCase() + '</span>' +
        '<span style="color:var(--text);font-weight:600;">' + (payload.ip || '') + '</span>' +
        (loc ? '<span style="color:var(--muted);">· ' + loc + '</span>' : '') +
      '</div>' +
      (payload.isp ? '<div style="margin-top:4px;color:var(--muted);font-size:11px;">' + payload.isp + '</div>' : '');
    return;
  }
  // error
  box.style.cssText = base + 'background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.35);color:#ef4444;';
  box.innerHTML = '✗ 检测失败：' + (payload && payload.error ? payload.error : '未知错误');
}

async function saveProxy() {
  var el = document.getElementById('cfg-proxy');
  if (!el) return;
  try {
    if (el.value.trim()) renderProxyDetectCard('loading');
    else renderProxyDetectCard('hidden');
    var result = await window.go.main.App.SetProxy(el.value.trim());
    if (result.error) {
      showToast(result.error, 'error');
      renderProxyDetectCard('hidden');
      return;
    }
    el.value = result.proxy || '';
    if (!result.proxy) {
      renderProxyDetectCard('hidden');
      showToast('已清空代理（直连）');
      return;
    }
    showToast('代理已保存');
    var d = result.detect;
    if (d && d.ok) renderProxyDetectCard('ok', d);
    else renderProxyDetectCard('error', d || {});
  } catch(e) {
    showToast('保存失败: ' + e.message, 'error');
    renderProxyDetectCard('error', { error: e.message });
  }
}

async function resetProxy() {
  try {
    await window.go.main.App.ResetProxy();
    var el = document.getElementById('cfg-proxy');
    if (el) el.value = '';
    renderProxyDetectCard('hidden');
    showToast('已清空代理（直连）');
  } catch(e) {
    showToast('清空失败: ' + e.message, 'error');
  }
}

// 代理池管理
async function saveProxyPool() {
  var el = document.getElementById('cfg-proxy-pool');
  if (!el) return;
  try {
    var lines = el.value.split('\n').map(function(line) { return line.trim(); }).filter(function(line) { return line && !line.startsWith('#'); });
    var result = await window.go.main.App.SetProxyPool(JSON.stringify(lines));
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast('代理池已保存 (' + lines.length + ' 个代理)');
    renderProxyPoolStatus('success', lines.length + ' 个代理已保存');
  } catch(e) {
    showToast('保存失败: ' + e.message, 'error');
  }
}

async function resetProxyPool() {
  try {
    await window.go.main.App.ResetProxyPool();
    var el = document.getElementById('cfg-proxy-pool');
    if (el) el.value = '';
    renderProxyPoolStatus('hidden');
    showToast('已清空代理池');
  } catch(e) {
    showToast('清空失败: ' + e.message, 'error');
  }
}

async function testProxyPool() {
  var el = document.getElementById('cfg-proxy-pool');
  if (!el) return;
  var lines = el.value.split('\n').map(function(line) { return line.trim(); }).filter(function(line) { return line && !line.startsWith('#'); });
  if (lines.length === 0) {
    showToast('请先输入代理地址', 'error');
    return;
  }

  renderProxyPoolStatus('loading', '正在测试代理池（最多测试前10个）...');

  try {
    var result = await window.go.main.App.TestProxyPool(JSON.stringify(lines));
    if (result.error) {
      renderProxyPoolStatus('error', result.error);
      return;
    }

    // 渲染详细结果
    renderProxyPoolResults(result);
  } catch(e) {
    renderProxyPoolStatus('error', '测试失败: ' + e.message);
  }
}

function renderProxyPoolResults(result) {
  var card = document.getElementById('proxy-pool-status');
  if (!card) return;

  card.style.display = 'block';
  card.style.backgroundColor = 'var(--card-bg)';
  card.style.border = '1px solid var(--border)';
  card.style.borderRadius = '8px';
  card.style.padding = '12px';

  var html = '<div style="margin-bottom:8px;font-weight:600;color:var(--text);">测试结果 (' + result.tested + '/' + result.total + ')</div>';

  for (var i = 0; i < result.results.length; i++) {
    var r = result.results[i];
    var itemStyle = 'padding:8px;margin-bottom:6px;border-radius:6px;font-size:11px;';

    if (r.ok) {
      var loc = [r.country, r.region, r.city].filter(Boolean).join(' · ');
      itemStyle += 'background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.35);';
      html += '<div style="' + itemStyle + '">';
      html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">';
      html += '<span style="color:#10b981;font-weight:600;">✓ #' + (i+1) + '</span>';
      html += '<span style="padding:1px 4px;border-radius:3px;background:rgba(16,185,129,0.15);color:#10b981;font-weight:600;">' + (r.scheme || '').toUpperCase() + '</span>';
      html += '<span style="color:var(--text);font-weight:600;">' + (r.ip || '') + '</span>';
      if (loc) html += '<span style="color:var(--muted);">· ' + loc + '</span>';
      html += '</div>';
      if (r.isp) html += '<div style="color:var(--muted);font-size:10px;">' + r.isp + '</div>';
      html += '</div>';
    } else {
      itemStyle += 'background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.35);';
      html += '<div style="' + itemStyle + '">';
      html += '<span style="color:#ef4444;font-weight:600;">✗ #' + (i+1) + '</span>';
      html += '<span style="color:#ef4444;margin-left:6px;">' + (r.error || '检测失败') + '</span>';
      html += '</div>';
    }
  }

  if (result.total > result.tested) {
    html += '<div style="margin-top:8px;color:var(--muted);font-size:11px;">仅显示前 ' + result.tested + ' 个代理的测试结果</div>';
  }

  card.innerHTML = html;
}

function renderProxyPoolStatus(type, message) {
  var card = document.getElementById('proxy-pool-status');
  if (!card) return;
  if (type === 'hidden') {
    card.style.display = 'none';
    return;
  }
  card.style.display = 'block';

  if (type === 'loading') {
    card.style.backgroundColor = 'var(--card-bg)';
    card.style.border = '1px solid var(--border)';
    card.style.color = 'var(--muted)';
    card.textContent = message;
    return;
  }

  var colors = {
    'info': { bg: 'var(--info-bg)', text: 'var(--info)' },
    'success': { bg: 'var(--success-bg)', text: 'var(--success)' },
    'error': { bg: 'var(--danger-bg)', text: 'var(--danger)' }
  };
  var color = colors[type] || colors['info'];
  card.style.backgroundColor = color.bg;
  card.style.border = 'none';
  card.style.color = color.text;
  card.textContent = message;
}

// UI 状态
function updateUIStatus(running) {
  var btnStarts = document.querySelectorAll('#btn-start');
  var btnStops = document.querySelectorAll('#btn-stop');
  btnStarts.forEach(function(btn) { if (btn) btn.disabled = running; });
  btnStops.forEach(function(btn) { if (btn) btn.disabled = !running; });
}

// 配置读写
function getFormConfig() {
  const config = {
    count: parseInt(document.getElementById('cfg-count').value) || 1,
    concurrency: parseInt(document.getElementById('cfg-concurrency').value) || 1,
    delay: parseInt(document.getElementById('cfg-delay').value) || 3,
    emailProvider: selectedEmailProvider || 'outlook'
  };

  // 如果选择了 MoeMail，添加域名信息和前缀配置
  if (config.emailProvider === 'moemail') {
    if (!selectedMoeMailDomains || selectedMoeMailDomains.length === 0) {
      throw new Error('请选择至少一个域名或选择随机/全部');
    }

    // 如果选择了随机或全部，传递所有可用域名和配置
    if (selectedMoeMailDomains.includes('__random__') || selectedMoeMailDomains.includes('__all__')) {
      config.moemailDomains = allMoeMailDomains.map(item => item.domain);
      config.moemailConfigs = {};
      allMoeMailDomains.forEach(item => {
        config.moemailConfigs[item.domain] = item.configs;
      });
      // 标记是否为随机模式
      config.moemailRandomMode = selectedMoeMailDomains.includes('__random__');
    } else {
      // 传递选中的域名和对应的配置
      config.moemailDomains = selectedMoeMailDomains;
      config.moemailConfigs = {};
      selectedMoeMailDomains.forEach(domain => {
        const item = allMoeMailDomains.find(d => d.domain === domain);
        if (item) {
          config.moemailConfigs[domain] = item.configs;
        }
      });
      config.moemailRandomMode = false;
    }
  }

  // 如果选择了 LuckMail，添加配置信息
  if (config.emailProvider === 'luckmail') {
    if (!luckmailConfigs || luckmailConfigs.length === 0) {
      throw new Error('请先在邮箱池页面添加 LuckMail 配置');
    }
    var idx = selectedLuckMailConfigIdx || 0;
    if (idx >= luckmailConfigs.length) idx = 0;
    config.luckmailConfig = luckmailConfigs[idx];
  }

  // 如果选择了 YYDS Mail，添加配置信息
  if (config.emailProvider === 'yydsmail') {
    if (!yydsmailConfigs || yydsmailConfigs.length === 0) {
      throw new Error('请先在邮箱池页面添加 YYDS Mail 配置');
    }
    var idx = selectedYYDSMailConfigIdx || 0;
    if (idx >= yydsmailConfigs.length) idx = 0;
    config.yydsmailConfig = yydsmailConfigs[idx];
  }

  // 如果选择了 TempMail.lol，添加配置信息
  if (config.emailProvider === 'tempmaillol') {
    if (!tempmaillolConfigs || tempmaillolConfigs.length === 0) {
      throw new Error('请先在邮箱池页面添加 TempMail.lol 配置');
    }
    var idx = selectedTempMailLolConfigIdx || 0;
    if (idx >= tempmaillolConfigs.length) idx = 0;
    config.tempmaillolConfig = tempmaillolConfigs[idx];
  }

  return config;
}

function saveConfig() {
  try {
    var cfg = getFormConfig();
    cfg.outlookData = document.getElementById('cfg-outlook-data').value;

    // 保存 MoeMail 域名选择
    if (selectedMoeMailDomains && selectedMoeMailDomains.length > 0) {
      cfg.moemailDomains = selectedMoeMailDomains;
    }

    // 保存 LuckMail 配置索引
    if (selectedLuckMailConfigIdx !== undefined) {
      cfg.luckmailConfigIdx = selectedLuckMailConfigIdx;
    }

    // 保存 YYDS Mail 配置索引
    if (selectedYYDSMailConfigIdx !== undefined) {
      cfg.yydsmailConfigIdx = selectedYYDSMailConfigIdx;
    }

    // 保存 TempMail.lol 配置索引
    if (selectedTempMailLolConfigIdx !== undefined) {
      cfg.tempmaillolConfigIdx = selectedTempMailLolConfigIdx;
    }

    localStorage.setItem('kiro-config', JSON.stringify(cfg));
  } catch(e) {
    console.error('配置保存失败:', e);
  }
}



// 自动保存
['cfg-count', 'cfg-concurrency', 'cfg-delay'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', saveConfig);
    el.addEventListener('input', saveConfig);
  }
});

// 提示音开关
(function() {
  var cb = document.getElementById('cfg-sound');
  if (cb) {
    var saved = localStorage.getItem('kiro-sound');
    cb.checked = saved !== 'false';
    cb.addEventListener('change', function() {
      localStorage.setItem('kiro-sound', cb.checked);
    });
  }
})();

// 初始化加载
async function loadConfig() {
  console.log('[启动] 开始初始化...');
  
  // 默认禁用所有功能，等待卡密验证
  
  let retries = 0;
  while ((!window.go || !window.go.main || !window.go.main.App) && retries < 100) {
    await new Promise(resolve => setTimeout(resolve, 50));
    retries++;
  }
  if (!window.go || !window.go.main || !window.go.main.App) {
    console.error('[启动] Wails runtime 加载失败');
    // 即使失败也显示界面
    document.getElementById('main-container').style.display = 'block';
    return;
  }
  console.log('[启动] Wails runtime 已就绪');

  // 检测平台，macOS 使用原生窗口控件
  try {
    const env = await window.runtime.Environment();
    if (env && env.platform === 'darwin') {
      document.body.classList.add('platform-darwin');
    }
  } catch(e) {}

  // 直接显示主界面
  console.log('[启动] 显示主界面');
  const mainContainer = document.getElementById('main-container');
  if (mainContainer) {
    mainContainer.style.display = 'block';
    mainContainer.style.height = '100vh';
    mainContainer.style.width = '100vw';
    mainContainer.style.position = 'fixed';
    mainContainer.style.top = '0';
    mainContainer.style.left = '0';
    mainContainer.style.zIndex = '1';
    
    // 隐藏骨架屏
    const skeleton = document.getElementById('skeleton-loader');
    if (skeleton) {
      skeleton.style.display = 'none';
    }
    
    console.log('[启动] main-container 已显示');
  } else {
    console.error('[启动] 找不到 main-container 元素');
  }
  
  try {
    var savedConfig = localStorage.getItem('kiro-config');
    if (savedConfig) {
      var cfg = JSON.parse(savedConfig);
      document.getElementById('cfg-count').value = cfg.count || 1;
      document.getElementById('cfg-concurrency').value = cfg.concurrency || 1;
      document.getElementById('cfg-delay').value = cfg.delay || 3;

      // 恢复邮箱提供商选择
      if (cfg.emailProvider) {
        selectedEmailProvider = cfg.emailProvider;
      }

      // 恢复 MoeMail 域名选择
      if (cfg.emailProvider === 'moemail' && cfg.moemailDomains) {
        selectedMoeMailDomains = cfg.moemailDomains;
      }

      // 恢复 LuckMail 配置索引
      if (cfg.emailProvider === 'luckmail' && cfg.luckmailConfigIdx !== undefined) {
        selectedLuckMailConfigIdx = cfg.luckmailConfigIdx;
      }

      // 恢复 YYDS Mail 配置索引
      if (cfg.emailProvider === 'yydsmail' && cfg.yydsmailConfigIdx !== undefined) {
        selectedYYDSMailConfigIdx = cfg.yydsmailConfigIdx;
      }
    }
  } catch(e) {
    console.error('[启动] 加载配置失败:', e);
  }
  loadOutlookAccountsList();
  loadDataDir();
  loadResultOutputDir();
  loadProxyPool();
  startOverviewTimer();
  console.log('[启动] 初始化完成');
}

// 页面加载时自动初始化
window.addEventListener('DOMContentLoaded', async function() {
  await loadConfig();
  initEmailProviderSelection();
  // 启动时静默检查更新
  setTimeout(checkUpdateOnStartup, 2000);
});

async function checkUpdateOnStartup() {
  try {
    var result = await window.go.main.App.CheckUpdate();
    if (result && result.hasUpdate) {
      if (typeof showUpdateModal === 'function') showUpdateModal(result);
    }
  } catch(e) {}
}

// 侧边栏信息按钮：10次点击触发调试弹窗
var _infoClickCount = 0;
var _infoClickTimer = null;
function onNavInfoClick() {
  switchPage('info');
  _infoClickCount++;
  clearTimeout(_infoClickTimer);
  _infoClickTimer = setTimeout(function() { _infoClickCount = 0; }, 2000);
  if (_infoClickCount >= 10) {
    _infoClickCount = 0;
    if (typeof showUpdateModal === 'function') {
      showUpdateModal({
        currentVersion: 'v1.0.1',
        latestVersion: 'v99.0.0',
        releaseDate: new Date().toISOString().slice(0, 10),
        changelog: '## 调试模式\n- 这是一条测试更新弹窗\n- 触发方式：点击信息按钮 10 次',
        hasUpdate: true
      });
    }
  }
}

function renderChangelog(md) {
  var esc = function(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  };
  var inline = function(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code style="background:var(--bg-subtle);padding:1px 5px;border-radius:4px;font-family:var(--font-mono);font-size:12px;">$1</code>');
  };

  var lines = md.split('\n');
  var html = '';
  var inList = false;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    var h2 = line.match(/^##\s+(.+)/);
    var h3 = line.match(/^###\s+(.+)/);
    var li = line.match(/^[-*]\s+(.+)/);
    var blank = line.trim() === '';

    if (h2) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<div class="cl-h2">' + inline(h2[1]) + '</div>';
    } else if (h3) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<div class="cl-h3">' + inline(h3[1]) + '</div>';
    } else if (li) {
      if (!inList) { html += '<ul class="cl-list">'; inList = true; }
      html += '<li>' + inline(li[1]) + '</li>';
    } else if (blank) {
      if (inList) { html += '</ul>'; inList = false; }
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<p class="cl-p">' + inline(line) + '</p>';
    }
  }
  if (inList) html += '</ul>';
  return html;
}

