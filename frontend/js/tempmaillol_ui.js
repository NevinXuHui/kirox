// ===== TempMail.lol UI 集成 =====

var selectedTempMailLolConfigIdx = 0;

// 加载 TempMail.lol 配置到选择列表
async function loadTempMailLolConfigToSelect() {
  const listDiv = document.getElementById('tempmaillol-config-list');
  if (!listDiv) return;

  listDiv.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:12px;">加载中...</div>';

  try {
    if (!tempmaillolConfigs || tempmaillolConfigs.length === 0) {
      listDiv.innerHTML = '<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:12px;">暂无配置，请先在设置页添加</div>';
      return;
    }

    let html = '';
    tempmaillolConfigs.forEach(function(cfg, idx) {
      const isSelected = idx === selectedTempMailLolConfigIdx;
      html += '<div class="domain-chip' + (isSelected ? ' selected' : '') + '" onclick="selectTempMailLolConfig(' + idx + ')" style="cursor:pointer;">';
      html += '<div style="font-weight:600;">' + escapeHtml(cfg.name) + '</div>';
      if (cfg.apiKey) {
        html += '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">API Key: ' + escapeHtml(cfg.apiKey.substring(0, 15)) + '...</div>';
      } else {
        html += '<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">免费层</div>';
      }
      html += '</div>';
    });

    listDiv.innerHTML = html;
  } catch (e) {
    console.error('加载 TempMail.lol 配置失败:', e);
    listDiv.innerHTML = '<div style="text-align:center;color:var(--danger);font-size:12px;padding:12px;">加载失败</div>';
  }
}

// 选择 TempMail.lol 配置
function selectTempMailLolConfig(idx) {
  selectedTempMailLolConfigIdx = idx;
  loadTempMailLolConfigToSelect();
  if (typeof saveConfig === 'function') {
    saveConfig();
  }
}
