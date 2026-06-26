// Content Script - Runs on every webpage
// Scans for phishing indicators and injects warnings

console.log('Web3 Anti-Phishing Guardian content script loaded');

let warningDisplayed = false;
let scannedAddresses = new Set();

// Inject the page script that hooks into window.ethereum
function injectPageScript() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
}

// Inject on document start
if (document.readyState === 'loading') {
  injectPageScript();
} else {
  injectPageScript();
}

// Check current domain
async function checkCurrentDomain() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'checkDomain',
      url: window.location.href
    });
    
    if (response && response.isPhishing) {
      showPhishingWarning(response);
    }
  } catch (error) {
    console.error('Error checking domain:', error);
  }
}

// Scan page for Ethereum addresses
function scanPageForAddresses() {
  const addressRegex = /0x[a-fA-F0-9]{40}/g;
  const textNodes = getTextNodes(document.body);
  const foundAddresses = [];
  
  textNodes.forEach(node => {
    const matches = node.textContent.match(addressRegex);
    if (matches) {
      matches.forEach(addr => {
        if (!scannedAddresses.has(addr)) {
          scannedAddresses.add(addr);
          foundAddresses.push({ address: addr, node });
        }
      });
    }
  });
  
  if (foundAddresses.length > 0) {
    checkAddresses(foundAddresses);
  }
}

// Get all text nodes in the page
function getTextNodes(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  
  let node;
  while (node = walker.nextNode()) {
    if (node.textContent.trim().length > 0) {
      textNodes.push(node);
    }
  }
  
  return textNodes;
}

// Check found addresses for malicious activity
async function checkAddresses(foundAddresses) {
  try {
    // Get user's trusted addresses
    const trustedResponse = await chrome.runtime.sendMessage({
      type: 'getTrustedAddresses'
    });
    
    const trustedAddresses = trustedResponse.addresses || [];
    
    for (const { address, node } of foundAddresses) {
      // Check if malicious
      const maliciousCheck = await chrome.runtime.sendMessage({
        type: 'checkAddress',
        address
      });
      
      if (maliciousCheck.isMalicious) {
        highlightSuspiciousAddress(node, address, maliciousCheck);
        continue;
      }
      
      // Check for poisoning
      if (trustedAddresses.length > 0) {
        const poisoningCheck = await chrome.runtime.sendMessage({
          type: 'checkPoisoning',
          address,
          userAddresses: trustedAddresses
        });
        
        if (poisoningCheck.isPoisoning) {
          highlightPoisonedAddress(node, address, poisoningCheck);
        }
      }
    }
  } catch (error) {
    console.error('Error checking addresses:', error);
  }
}

// Highlight suspicious address in the page
function highlightSuspiciousAddress(node, address, checkResult) {
  try {
    const parent = node.parentElement;
    if (!parent) return;
    
    const text = node.textContent;
    const index = text.indexOf(address);
    
    if (index !== -1) {
      const span = document.createElement('span');
      span.style.cssText = `
        background-color: #ff000033;
        border: 2px solid #ff0000;
        border-radius: 4px;
        padding: 2px 4px;
        cursor: pointer;
        position: relative;
      `;
      span.textContent = address;
      span.title = `⚠️ ${checkResult.reason}`;
      
      // Add warning icon
      const icon = document.createElement('span');
      icon.textContent = '⚠️';
      icon.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        font-size: 16px;
      `;
      span.appendChild(icon);
      
      const before = document.createTextNode(text.substring(0, index));
      const after = document.createTextNode(text.substring(index + address.length));
      
      parent.insertBefore(before, node);
      parent.insertBefore(span, node);
      parent.insertBefore(after, node);
      parent.removeChild(node);
    }
  } catch (error) {
    console.error('Error highlighting address:', error);
  }
}

// Highlight poisoned address (similar address to trusted one)
function highlightPoisonedAddress(node, address, checkResult) {
  try {
    const parent = node.parentElement;
    if (!parent) return;
    
    const text = node.textContent;
    const index = text.indexOf(address);
    
    if (index !== -1) {
      const span = document.createElement('span');
      span.style.cssText = `
        background-color: #ff990033;
        border: 2px solid #ff9900;
        border-radius: 4px;
        padding: 2px 4px;
        cursor: pointer;
        animation: pulse 2s infinite;
      `;
      span.textContent = address;
      span.title = `⚠️ ADDRESS POISONING: ${checkResult.reason}`;
      
      // Add click handler to show details
      span.addEventListener('click', () => {
        showPoisoningDetails(address, checkResult);
      });
      
      const before = document.createTextNode(text.substring(0, index));
      const after = document.createTextNode(text.substring(index + address.length));
      
      parent.insertBefore(before, node);
      parent.insertBefore(span, node);
      parent.insertBefore(after, node);
      parent.removeChild(node);
    }
  } catch (error) {
    console.error('Error highlighting poisoned address:', error);
  }
}

// Show poisoning details modal
function showPoisoningDetails(address, checkResult) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 3px solid #ff9900;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 999999;
    max-width: 500px;
    font-family: Arial, sans-serif;
  `;
  
  modal.innerHTML = `
    <h2 style="color: #ff9900; margin-top: 0;">⚠️ Address Poisoning Detected</h2>
    <p><strong>Suspicious Address:</strong></p>
    <code style="background: #f5f5f5; padding: 8px; display: block; border-radius: 4px; word-break: break-all;">${address}</code>
    <p><strong>Similar to your trusted address:</strong></p>
    <code style="background: #e8f5e9; padding: 8px; display: block; border-radius: 4px; word-break: break-all;">${checkResult.similarTo}</code>
    <p style="color: #d32f2f;"><strong>⚠️ Warning:</strong> ${checkResult.reason}</p>
    <p>This address is ${(checkResult.similarity * 100).toFixed(0)}% similar to one of your trusted addresses. This is a common scam technique called "address poisoning".</p>
    <button id="closeModal" style="
      background: #ff9900;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      width: 100%;
      margin-top: 16px;
    ">Close</button>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('closeModal').addEventListener('click', () => {
    modal.remove();
  });
  
  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function closeOnOutside(e) {
      if (!modal.contains(e.target)) {
        modal.remove();
        document.removeEventListener('click', closeOnOutside);
      }
    });
  }, 100);
}

// Show phishing warning overlay
function showPhishingWarning(checkResult) {
  if (warningDisplayed) return;
  warningDisplayed = true;
  
  const overlay = document.createElement('div');
  overlay.id = 'web3-phishing-warning';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  const severity = checkResult.severity || 'high';
  const severityColors = {
    critical: '#d32f2f',
    high: '#f57c00',
    medium: '#ffa000',
    low: '#fbc02d'
  };
  
  const warningBox = document.createElement('div');
  warningBox.style.cssText = `
    background: white;
    border-radius: 16px;
    padding: 48px;
    max-width: 600px;
    text-align: center;
    box-shadow: 0 16px 48px rgba(0,0,0,0.5);
  `;
  
  warningBox.innerHTML = `
    <div style="font-size: 72px; margin-bottom: 24px;">🛡️</div>
    <h1 style="color: ${severityColors[severity]}; margin: 0 0 16px 0; font-size: 32px;">
      ⚠️ PHISHING SITE DETECTED
    </h1>
    <p style="font-size: 18px; color: #333; margin-bottom: 24px;">
      ${checkResult.reason}
    </p>
    ${checkResult.similarTo ? `
      <p style="background: #fff3e0; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <strong>This site may be impersonating:</strong><br>
        <code style="font-size: 16px; color: #e65100;">${checkResult.similarTo}</code>
      </p>
    ` : ''}
    <p style="color: #666; margin-bottom: 32px;">
      This website has been identified as a potential phishing site. 
      Connecting your wallet or signing transactions here could result in loss of funds.
    </p>
    <div style="display: flex; gap: 16px; justify-content: center;">
      <button id="goBack" style="
        background: ${severityColors[severity]};
        color: white;
        border: none;
        padding: 16px 32px;
        border-radius: 8px;
        font-size: 18px;
        cursor: pointer;
        font-weight: bold;
      ">Go Back to Safety</button>
      <button id="ignoreWarning" style="
        background: transparent;
        color: #666;
        border: 2px solid #ccc;
        padding: 16px 32px;
        border-radius: 8px;
        font-size: 18px;
        cursor: pointer;
      ">Ignore Warning (Not Recommended)</button>
    </div>
    <p style="color: #999; font-size: 14px; margin-top: 24px;">
      Protected by Web3 Anti-Phishing Guardian
    </p>
  `;
  
  overlay.appendChild(warningBox);
  document.body.appendChild(overlay);
  
  // Go back button
  document.getElementById('goBack').addEventListener('click', () => {
    window.history.back();
  });
  
  // Ignore warning button
  document.getElementById('ignoreWarning').addEventListener('click', () => {
    if (confirm('Are you absolutely sure you want to proceed? This site has been flagged as dangerous.')) {
      overlay.remove();
      warningDisplayed = false;
    }
  });
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'domainWarning') {
    showPhishingWarning(request.data);
  } else if (request.type === 'transactionBlocked') {
    showTransactionBlockedWarning(request.data);
  }
  
  sendResponse({ received: true });
});

// Listen for messages from injected script
window.addEventListener('message', async (event) => {
  if (event.source !== window) return;
  
  if (event.data.type === 'WEB3_TRANSACTION_REQUEST') {
    const tx = event.data.transaction;
    
    // Get trusted addresses
    const trustedResponse = await chrome.runtime.sendMessage({
      type: 'getTrustedAddresses'
    });
    
    // Analyze transaction
    const analysis = await chrome.runtime.sendMessage({
      type: 'analyzeTransaction',
      transaction: tx,
      userAddresses: trustedResponse.addresses || []
    });
    
    // Send result back to injected script
    window.postMessage({
      type: 'WEB3_TRANSACTION_ANALYSIS',
      analysis,
      transactionId: event.data.transactionId
    }, '*');
  }
});

// Show transaction blocked warning
function showTransactionBlockedWarning(data) {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 3px solid #d32f2f;
    border-radius: 12px;
    padding: 32px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    z-index: 2147483646;
    max-width: 600px;
    font-family: Arial, sans-serif;
  `;
  
  modal.innerHTML = `
    <h2 style="color: #d32f2f; margin-top: 0;">🚫 Transaction Blocked</h2>
    <p><strong>Risk Level:</strong> <span style="color: #d32f2f; text-transform: uppercase;">${data.riskLevel}</span></p>
    <p><strong>Risks Detected:</strong></p>
    <ul style="text-align: left; color: #666;">
      ${data.risks.map(risk => `<li><strong>${risk.type}:</strong> ${risk.message}</li>`).join('')}
    </ul>
    <p style="color: #d32f2f;"><strong>⚠️ This transaction has been automatically blocked for your protection.</strong></p>
    <button id="closeBlockedModal" style="
      background: #d32f2f;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      width: 100%;
      margin-top: 16px;
    ">Close</button>
  `;
  
  document.body.appendChild(modal);
  
  document.getElementById('closeBlockedModal').addEventListener('click', () => {
    modal.remove();
  });
}

// Initialize
checkCurrentDomain();

// Scan page when loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(scanPageForAddresses, 1000);
  });
} else {
  setTimeout(scanPageForAddresses, 1000);
}

// Re-scan periodically for dynamic content
setInterval(scanPageForAddresses, 5000);

// Add pulse animation
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;
document.head.appendChild(style);
