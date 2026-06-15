// ===== 核心：导航 / 标签页 / 下拉框 / 配置 / 卡密 / Toast / 窗口控制 =====

// 页面切换
var _currentPageId = 'overview';
function getPageTitle(pageId) {
  if (window.I18N && pageId) {
    var v = window.I18N.t('page.' + pageId);
    if (v && v !== 'page.' + pageId) return v;
  }
  var fallback = { overview: '概览', logs: '运行日志', register: '注册', accounts: '邮箱池', subscription: '订阅', info: '关于', settings: '设置' };
  return fallback[pageId] || pageId;
}
function switchPage(pageId) {
  _currentPageId = pageId;
  document.querySelectorAll('.page, .page-placeholder, .page-iframe').forEach(function(p) {
    p.classList.remove('active');
  });
  var target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item[data-page]').forEach(function(item) {
    item.classList.toggle('active', item.getAttribute('data-page') === pageId);
  });
  document.getElementById('titlebar-text').textContent = getPageTitle(pageId);
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
  if (changelogEl) changelogEl.innerHTML = '<span style="color:var(--text-muted);">' + tr('common.loading', '加载中...') + '</span>';
  try {
    var result = await window.go.main.App.CheckUpdate();
    if (result.error) {
      if (changelogEl) changelogEl.innerHTML = '<span style="color:var(--text-muted);">' + tr('common.loadFailed', '加载失败') + ': ' + result.error + '</span>';
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
      changelogEl.innerHTML = body ? renderChangelog(body) : '<span style="color:var(--text-muted);">' + tr('common.noData', '暂无更新说明') + '</span>';
    }
  } catch(e) {
    if (changelogEl) changelogEl.innerHTML = '<span style="color:var(--text-muted);">' + tr('common.loadFailed', '加载失败') + '</span>';
  }
}

// 翻译辅助：t() 返回 key 自身时回落到 fallback
function tr(key, fallback) {
  if (window.I18N && typeof window.I18N.t === 'function') {
    var v = window.I18N.t(key);
    if (v && v !== key) return v;
  }
  return fallback != null ? fallback : key;
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
    showToast(tr('toast.dataDirSet', '存储目录已设置'));
  } catch(e) {
    showToast(tr('toast.operationFailed', '操作失败') + ': ' + e.message, 'error');
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
    showToast(tr('toast.dataDirReset', '已重置为默认存储目录'));
  } catch(e) {
    showToast(tr('toast.operationFailed', '操作失败') + ': ' + e.message, 'error');
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
    showToast(tr('toast.outputDirSet', '输出目录已设置') + ': ' + result.path);
  } catch(e) {
    showToast(tr('toast.operationFailed', '操作失败') + ': ' + e.message, 'error');
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
    showToast(tr('toast.outputDirReset', '已重置为默认输出目录'));
  } catch(e) {
    showToast(tr('toast.operationFailed', '操作失败') + ': ' + e.message, 'error');
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
      showToast(tr('toast.proxyCleared', '代理已清除'));
      return;
    }
    showToast(tr('toast.proxySaved', '代理已保存'));
    var d = result.detect;
    if (d && d.ok) renderProxyDetectCard('ok', d);
    else renderProxyDetectCard('error', d || {});
  } catch(e) {
    showToast(tr('toast.operationFailed', '操作失败') + ': ' + e.message, 'error');
    renderProxyDetectCard('error', { error: e.message });
  }
}

async function resetProxy() {
  try {
    await window.go.main.App.ResetProxy();
    var el = document.getElementById('cfg-proxy');
    if (el) el.value = '';
    renderProxyDetectCard('hidden');
    showToast(tr('toast.proxyCleared', '代理已清除'));
  } catch(e) {
    showToast(tr('toast.operationFailed', '操作失败') + ': ' + e.message, 'error');
  }
}

// UI 状态
function updateUIStatus(running) {
  var btnStarts = document.querySelectorAll('#btn-start');
  var btnStops = document.querySelectorAll('#btn-stop');
  btnStarts.forEach(function(btn) { if (btn) btn.disabled = running; });
  btnStops.forEach(function(btn) { if (btn) btn.disabled = !running; });
}

function readAccountsPerFolder() {
  var el = document.getElementById('cfg-accounts-per-folder');
  if (!el) return 0;
  var value = parseInt(el.value, 10);
  return value > 0 ? value : 0;
}

// 配置读写
function getFormConfig() {
  const config = {
    count: parseInt(document.getElementById('cfg-count').value) || 1,
    concurrency: parseInt(document.getElementById('cfg-concurrency').value) || 1,
    delay: parseInt(document.getElementById('cfg-delay').value) || 3,
    accountsPerFolder: readAccountsPerFolder(),
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

  // 如果选择了 Cloud-Mail，添加域名信息和配置
  if (config.emailProvider === 'cloudmail') {
    if (!selectedCloudMailDomains || selectedCloudMailDomains.length === 0) {
      throw new Error('请选择至少一个 Cloud-Mail 域名');
    }

    if (selectedCloudMailDomains.includes('__random__') || selectedCloudMailDomains.includes('__all__')) {
      config.cloudmailDomains = allCloudMailDomains.map(item => item.domain);
      config.cloudmailConfigs = {};
      allCloudMailDomains.forEach(item => {
        config.cloudmailConfigs[item.domain] = item.configs;
      });
      config.cloudmailRandomMode = selectedCloudMailDomains.includes('__random__');
    } else {
      config.cloudmailDomains = selectedCloudMailDomains;
      config.cloudmailConfigs = {};
      selectedCloudMailDomains.forEach(domain => {
        const item = allCloudMailDomains.find(d => d.domain === domain);
        if (item) {
          config.cloudmailConfigs[domain] = item.configs;
        }
      });
      config.cloudmailRandomMode = false;
    }
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
['cfg-count', 'cfg-concurrency', 'cfg-delay', 'cfg-accounts-per-folder'].forEach(function(id) {
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
      var accountsPerFolderEl = document.getElementById('cfg-accounts-per-folder');
      if (accountsPerFolderEl) accountsPerFolderEl.value = cfg.accountsPerFolder || 0;

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
  loadProxy();
  if (typeof loadProxyPool === 'function') loadProxyPool();
  startOverviewTimer();
  console.log('[启动] 初始化完成');
}

// 页面加载时自动初始化
window.addEventListener('DOMContentLoaded', async function() {
  await loadConfig();
  initEmailProviderSelection();
  // 初始化 i18n（在 Wails runtime 就绪后），失败时不阻塞主流程
  try {
    if (window.I18N && typeof window.I18N.init === 'function') {
      await window.I18N.init();
      var sel = document.getElementById('cfg-language');
      if (sel) sel.value = window.I18N.getLanguage();
      refreshLanguageNavLabel();
      // 重新渲染依赖 i18n 的动态文本
      var tb = document.getElementById('titlebar-text');
      if (tb) tb.textContent = getPageTitle(_currentPageId);
    }
  } catch(e) {}
  // 语言切换时刷新动态文本
  window.addEventListener('i18n:changed', function() {
    var tb = document.getElementById('titlebar-text');
    if (tb) tb.textContent = getPageTitle(_currentPageId);
    refreshLanguageNavLabel();
  });
  // 启动时静默检查更新
  setTimeout(checkUpdateOnStartup, 2000);
});

// 语言切换（设置页下拉）
async function onLanguageChange(lang) {
  if (!lang || !window.I18N) return;
  try {
    window.I18N.setLanguage(lang);
    showToast(tr('toast.languageChanged', '已切换语言'));
  } catch(e) {
    showToast(tr('toast.operationFailed', '操作失败') + ': ' + e.message, 'error');
  }
}

// 语言循环切换（侧栏点击）：zh → en → ja → zh
var _langOrder = ['zh', 'en', 'ja'];
var _langLabel = { zh: '中', en: 'EN', ja: 'あ' };
var _langFlag = { zh: 'cn', en: 'us', ja: 'jp' };
function cycleLanguage() {
  if (!window.I18N) return;
  var cur = window.I18N.getLanguage();
  var idx = _langOrder.indexOf(cur);
  var next = _langOrder[(idx + 1) % _langOrder.length];
  try {
    window.I18N.setLanguage(next);
    showToast(tr('toast.languageChanged', '已切换语言'));
  } catch(e) {
    showToast(tr('toast.operationFailed', '操作失败') + ': ' + e.message, 'error');
  }
}
function refreshLanguageNavLabel() {
  var el = document.getElementById('nav-language-label');
  if (!el || !window.I18N) return;
  var cur = window.I18N.getLanguage();
  if (el.tagName === 'IMG') {
    el.src = 'https://flagcdn.com/w40/' + (_langFlag[cur] || 'cn') + '.png';
    el.alt = cur;
  } else {
    el.textContent = _langLabel[cur] || cur;
  }
}

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

// ===== Clash 外部控制 =====

// 加载 Clash 配置
function loadClashConfig() {
  window.go.main.App.GetClashConfig().then(function(config) {
    document.getElementById('cfg-clash-url').value = config.url || '';
    document.getElementById('cfg-clash-secret').value = config.secret || '';
  }).catch(function(err) {
    console.error('加载 Clash 配置失败:', err);
  });
}

// 保存 Clash 配置
function saveClashConfig() {
  var url = document.getElementById('cfg-clash-url').value.trim();
  var secret = document.getElementById('cfg-clash-secret').value.trim();

  window.go.main.App.SaveClashConfig(url, secret).then(function(resp) {
    if (resp.success) {
      showToast('Clash 配置已保存', 'success');
    } else {
      showToast('保存失败: ' + (resp.error || '未知错误'), 'error');
    }
  }).catch(function(err) {
    showToast('保存失败: ' + err, 'error');
  });
}

// 测试 Clash 连接
function testClashConnection() {
  var url = document.getElementById('cfg-clash-url').value.trim();
  var secret = document.getElementById('cfg-clash-secret').value.trim();

  if (!url) {
    showToast('请先填写 Clash 外部控制地址', 'warning');
    return;
  }

  // 先保存配置
  window.go.main.App.SaveClashConfig(url, secret).then(function() {
    return window.go.main.App.TestClashConnection();
  }).then(function(resp) {
    var card = document.getElementById('clash-status-card');
    if (resp.success) {
      card.innerHTML = '<div style="padding:8px;background:var(--success-bg);color:var(--success-text);border-radius:6px;font-size:13px;">✓ 连接成功</div>';
      card.style.display = 'block';
      showToast('Clash 连接成功', 'success');
    } else {
      card.innerHTML = '<div style="padding:8px;background:var(--error-bg);color:var(--error-text);border-radius:6px;font-size:13px;">✗ ' + (resp.error || '连接失败') + '</div>';
      card.style.display = 'block';
      showToast('连接失败: ' + (resp.error || '未知错误'), 'error');
    }
  }).catch(function(err) {
    var card = document.getElementById('clash-status-card');
    card.innerHTML = '<div style="padding:8px;background:var(--error-bg);color:var(--error-text);border-radius:6px;font-size:13px;">✗ ' + err + '</div>';
    card.style.display = 'block';
    showToast('连接失败: ' + err, 'error');
  });
}

// 打开 Clash 节点选择器
function openClashProxySelector() {
  window.go.main.App.GetClashProxyGroups().then(function(resp) {
    if (!resp.success) {
      showToast('获取节点列表失败: ' + (resp.error || '未知错误'), 'error');
      return;
    }

    var groups = resp.groups || [];
    if (groups.length === 0) {
      showToast('未找到可切换的代理组', 'warning');
      return;
    }

    showClashProxyModal(groups);
  }).catch(function(err) {
    showToast('获取节点列表失败: ' + err, 'error');
  });
}

// 显示 Clash 节点选择弹窗
function showClashProxyModal(groups) {
  var modal = document.createElement('div');
  modal.id = 'clash-proxy-modal';
  modal.className = 'modal-overlay show';
  modal.style.zIndex = '10000';

  var groupsHtml = groups.map(function(group) {
    var nodesHtml = (group.all || []).map(function(node) {
      var isCurrent = node === group.now;
      return '<button class="clash-node-btn' + (isCurrent ? ' current' : '') + '" data-group="' + group.name + '" data-node="' + node + '">' +
        (isCurrent ? '✓ ' : '') + node +
        '</button>';
    }).join('');

    return '<div class="clash-group">' +
      '<div class="clash-group-title">' + group.name + '<span style="color:var(--text-secondary);font-size:12px;margin-left:8px;">(' + group.type + ')</span></div>' +
      '<div class="clash-nodes">' + nodesHtml + '</div>' +
      '</div>';
  }).join('');

  modal.innerHTML = '<div style="width:100%;max-width:600px;padding:24px;">' +
    '<div class="card" style="padding:24px;">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid var(--border-color);padding-bottom:12px;">' +
    '<h3 style="margin:0;font-size:16px;font-weight:600;">切换 Clash 节点</h3>' +
    '<button onclick="closeClashModal()" style="background:none;border:none;font-size:24px;color:var(--text-secondary);cursor:pointer;padding:0;width:32px;height:32px;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:all 0.2s;" onmouseover="this.style.background=\'var(--bg-hover)\'" onmouseout="this.style.background=\'none\'">×</button>' +
    '</div>' +
    '<div style="max-height:60vh;overflow-y:auto;">' +
    groupsHtml +
    '</div>' +
    '</div>' +
    '</div>';

  document.body.appendChild(modal);

  // 点击遮罩层关闭
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeClashModal();
    }
  });

  // 绑定节点切换事件
  modal.querySelectorAll('.clash-node-btn').forEach(function(btn) {
    btn.onclick = function() {
      var group = this.getAttribute('data-group');
      var node = this.getAttribute('data-node');
      switchClashNode(group, node, this);
    };
  });

  // 添加样式
  if (!document.getElementById('clash-modal-styles')) {
    var style = document.createElement('style');
    style.id = 'clash-modal-styles';
    style.textContent = '.clash-group { margin-bottom: 20px; }' +
      '.clash-group:last-child { margin-bottom: 0; }' +
      '.clash-group-title { font-weight: 600; margin-bottom: 10px; font-size: 14px; color: var(--text); }' +
      '.clash-nodes { display: flex; flex-wrap: wrap; gap: 8px; }' +
      '.clash-node-btn { padding: 8px 14px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-secondary); cursor: pointer; font-size: 13px; transition: all 0.2s; color: var(--text); font-family: inherit; }' +
      '.clash-node-btn:hover { background: var(--bg-hover); border-color: var(--primary-color); }' +
      '.clash-node-btn.current { background: var(--primary-color); color: white; border-color: var(--primary-color); }' +
      '.clash-node-btn:disabled { opacity: 0.5; cursor: not-allowed; }';
    document.head.appendChild(style);
  }
}

// 关闭 Clash 弹窗
function closeClashModal() {
  var modal = document.getElementById('clash-proxy-modal');
  if (modal) {
    modal.remove();
  }
}

// 切换 Clash 节点
function switchClashNode(group, node, btnElement) {
  // 禁用所有按钮
  var allBtns = document.querySelectorAll('.clash-node-btn');
  allBtns.forEach(function(btn) { btn.disabled = true; });

  window.go.main.App.SwitchClashProxy(group, node).then(function(resp) {
    if (resp.success) {
      showToast('已切换到 ' + node, 'success');
      // 更新当前选中状态
      var groupBtns = document.querySelectorAll('.clash-node-btn[data-group="' + group + '"]');
      groupBtns.forEach(function(btn) {
        btn.classList.remove('current');
        btn.textContent = btn.getAttribute('data-node');
      });
      btnElement.classList.add('current');
      btnElement.textContent = '✓ ' + node;
    } else {
      showToast('切换失败: ' + (resp.error || '未知错误'), 'error');
    }
  }).catch(function(err) {
    showToast('切换失败: ' + err, 'error');
  }).finally(function() {
    // 重新启用所有按钮
    allBtns.forEach(function(btn) { btn.disabled = false; });
  });
}

// 自动保存 Clash 配置
['cfg-clash-url', 'cfg-clash-secret'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) {
    el.addEventListener('change', saveClashConfig);
  }
});

// 页面加载时加载 Clash 配置
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadClashConfig);
} else {
  loadClashConfig();
}
