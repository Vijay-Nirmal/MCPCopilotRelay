const vscode = acquireVsCodeApi();

let servers = [];
let toolStates = {};

// Handle messages from extension
window.addEventListener('message', event => {
  const message = event.data;

  switch (message.type) {
    case 'serverStatus':
      servers = message.statuses;
      renderServers();
      // Request tool states for all servers
      servers.forEach(server => {
        vscode.postMessage({ type: 'getToolStates', serverName: server.name });
      });
      break;

    case 'toolStates':
      toolStates[message.serverName] = message.states;
      renderServers();
      break;
  }
});

function renderServers() {
  const container = document.getElementById('servers-container');

  if (servers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No MCP servers configured</p>
        <p class="hint">Click "Add Server" above to get started</p>
      </div>
    `;
    return;
  }

  container.innerHTML = servers.map(server => `
    <div class="server-card">
      <div class="server-header">
        <div class="server-info">
          <h3>${escapeHtml(server.name)}</h3>
          <span class="status-badge status-${server.status}">${server.status}</span>
        </div>
        <div class="server-actions">
          ${server.status === 'disconnected' || server.status === 'error' ?
      `<vscode-button appearance="icon" data-action="connect" data-server="${escapeHtml(server.name)}" title="Connect">
              <span class="codicon codicon-plug"></span>
            </vscode-button>` :
      `<vscode-button appearance="icon" data-action="disconnect" data-server="${escapeHtml(server.name)}" title="Disconnect">
              <span class="codicon codicon-debug-disconnect"></span>
            </vscode-button>`
    }
          <vscode-button appearance="icon" data-action="remove" data-server="${escapeHtml(server.name)}" title="Remove">
            <span class="codicon codicon-trash"></span>
          </vscode-button>
        </div>
      </div>
      
      ${server.error ? `
        <div class="error-container">
          <div class="error-message">${escapeHtml(server.error)}</div>
          <div class="error-actions">
            <vscode-button appearance="secondary" data-action="show-error" data-server="${escapeHtml(server.name)}">
              <span class="codicon codicon-info"></span>
              Show Details
            </vscode-button>
            <vscode-button appearance="secondary" data-action="reconnect" data-server="${escapeHtml(server.name)}">
              <span class="codicon codicon-refresh"></span>
              Reconnect
            </vscode-button>
          </div>
        </div>
      ` : ''}
      
      <div class="tools-section">
        <h4>Tools (${server.tools.length})</h4>
        ${server.tools.length === 0 ?
      '<p class="no-tools">No tools discovered</p>' :
      `<div class="tools-list">
            ${server.tools.map(tool => {
        const state = (toolStates[server.name] || {})[tool.name] || { enabled: true };
        return `
                <div class="tool-item">
                  <div class="tool-info">
                    <vscode-checkbox 
                      ${state.enabled ? 'checked' : ''} 
                      data-action="toggle-tool"
                      data-server="${escapeHtml(server.name)}"
                      data-tool="${escapeHtml(tool.name)}">
                      ${escapeHtml(tool.name)}
                    </vscode-checkbox>
                    ${tool.description ? `<p class="tool-description">${escapeHtml(tool.description)}</p>` : ''}
                  </div>
                  ${state.customName ? `<span class="custom-name">→ ${escapeHtml(state.customName)}</span>` : ''}
                </div>
              `;
      }).join('')}
          </div>`
    }
      </div>
    </div>
  `).join('');

  // Attach event listeners
  container.querySelectorAll('[data-action="connect"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = e.target.closest('[data-action="connect"]');
      const serverName = button.getAttribute('data-server');
      vscode.postMessage({ type: 'connectServer', serverName });
    });
  });

  container.querySelectorAll('[data-action="disconnect"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = e.target.closest('[data-action="disconnect"]');
      const serverName = button.getAttribute('data-server');
      vscode.postMessage({ type: 'disconnectServer', serverName });
    });
  });

  container.querySelectorAll('[data-action="remove"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = e.target.closest('[data-action="remove"]');
      const serverName = button.getAttribute('data-server');
      if (confirm(`Are you sure you want to remove server "${serverName}"?`)) {
        vscode.postMessage({ type: 'removeServer', serverName });
      }
    });
  });

  container.querySelectorAll('[data-action="toggle-tool"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const serverName = e.currentTarget.getAttribute('data-server');
      const toolName = e.currentTarget.getAttribute('data-tool');
      const enabled = e.currentTarget.checked;

      vscode.postMessage({
        type: 'setToolState',
        serverName,
        toolName,
        state: { enabled }
      });
    });
  });

  // Reconnect button
  container.querySelectorAll('[data-action="reconnect"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = e.target.closest('[data-action="reconnect"]');
      const serverName = button.getAttribute('data-server');
      vscode.postMessage({ type: 'reconnectServer', serverName });
    });
  });

  // Show error details button
  container.querySelectorAll('[data-action="show-error"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = e.target.closest('[data-action="show-error"]');
      const serverName = button.getAttribute('data-server');
      const server = servers.find(s => s.name === serverName);
      if (server && server.error) {
        showErrorDetails(serverName, server.error, server.errorStack);
      }
    });
  });
}

function toggleAddServerForm() {
  const formContainer = document.getElementById('add-server-form-container');
  const isVisible = formContainer.style.display !== 'none';

  if (isVisible) {
    formContainer.style.display = 'none';
  } else {
    formContainer.style.display = 'block';
    // Focus on name field
    setTimeout(() => {
      document.getElementById('server-name')?.focus();
    }, 100);
  }
}

function hideAddServerForm() {
  const formContainer = document.getElementById('add-server-form-container');
  formContainer.style.display = 'none';
  
  // Reset form
  document.getElementById('server-name').value = '';
  document.getElementById('server-command').value = '';
  document.getElementById('server-args').value = '';
  document.getElementById('server-url').value = '';
  document.getElementById('server-apikey').value = '';
  document.getElementById('server-http-url').value = '';
  document.getElementById('server-http-apikey').value = '';
}function showErrorDetails(serverName, errorMessage, errorStack) {
  const dialog = document.getElementById('error-details-dialog');
  const content = document.getElementById('error-details-content');

  content.innerHTML = `
    <div class="error-detail-item">
      <strong>Server:</strong> ${escapeHtml(serverName)}
    </div>
    <div class="error-detail-item">
      <strong>Error Message:</strong>
      <pre>${escapeHtml(errorMessage)}</pre>
    </div>
    ${errorStack ? `
      <div class="error-detail-item">
        <strong>Stack Trace:</strong>
        <pre class="stack-trace">${escapeHtml(errorStack)}</pre>
      </div>
    ` : ''}
  `;

  dialog.style.display = 'block';
}

function hideErrorDetails() {
  const dialog = document.getElementById('error-details-dialog');
  dialog.style.display = 'none';
}

function handleTransportChange(e) {
  const transport = e.target.value || e.target.currentValue;
  const stdioFields = document.getElementById('stdio-fields');
  const sseFields = document.getElementById('sse-fields');
  const httpFields = document.getElementById('http-fields');
  
  // Hide all transport-specific fields first
  stdioFields.style.display = 'none';
  sseFields.style.display = 'none';
  httpFields.style.display = 'none';
  
  // Show the relevant fields based on transport type
  if (transport === 'sse') {
    sseFields.style.display = 'block';
  } else if (transport === 'http') {
    httpFields.style.display = 'block';
  } else {
    stdioFields.style.display = 'block';
  }
}function handleAddServer(e) {
  e.preventDefault();
  
  const name = document.getElementById('server-name').value;
  const transportDropdown = document.getElementById('server-transport');
  const transport = transportDropdown.value || transportDropdown.currentValue || 'stdio';
  
  const config = {
    name,
    transport,
    enabled: true
  };

  if (transport === 'sse') {
    // SSE (legacy remote) server
    const url = document.getElementById('server-url').value;
    const apiKey = document.getElementById('server-apikey').value;
    
    if (!url) {
      alert('Server URL is required for SSE transport');
      return;
    }
    
    config.url = url;
    if (apiKey) {
      config.apiKey = apiKey;
    }
  } else if (transport === 'http') {
    // HTTP (modern remote) server
    const url = document.getElementById('server-http-url').value;
    const apiKey = document.getElementById('server-http-apikey').value;
    
    if (!url) {
      alert('Server URL is required for HTTP transport');
      return;
    }
    
    config.url = url;
    if (apiKey) {
      config.apiKey = apiKey;
    }
  } else {
    // Stdio (local) server
    const command = document.getElementById('server-command').value;
    const argsInput = document.getElementById('server-args').value;
    const args = argsInput ? argsInput.split(',').map(arg => arg.trim()).filter(arg => arg) : [];
    
    if (!command) {
      alert('Command is required for stdio transport');
      return;
    }
    
    config.command = command;
    config.args = args;
  }

  vscode.postMessage({
    type: 'addServer',
    config
  });

  hideAddServerForm();
}function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Initialize - run immediately since script is at end of body
(function init() {
  const toggleAddBtn = document.getElementById('toggle-add-server-btn');
  const cancelBtn = document.getElementById('cancel-add-server');
  const closeErrorBtn = document.getElementById('close-error-details');
  const form = document.getElementById('add-server-form');
  const transportDropdown = document.getElementById('server-transport');

  if (toggleAddBtn) {
    toggleAddBtn.addEventListener('click', toggleAddServerForm);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', hideAddServerForm);
  }

  if (closeErrorBtn) {
    closeErrorBtn.addEventListener('click', hideErrorDetails);
  }

  if (form) {
    form.addEventListener('submit', handleAddServer);
  }

  if (transportDropdown) {
    transportDropdown.addEventListener('change', handleTransportChange);
  }

  // Request initial server data
  vscode.postMessage({ type: 'getServers' });
})();
