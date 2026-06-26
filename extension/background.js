// Background Service Worker for Web3 Anti-Phishing Extension

// Threat intelligence and blocklists
let phishingDomains = new Set();
let maliciousAddresses = new Set();
let trustedDapps = new Set();
let userSettings = {
  enableProtection: true,
  strictMode: false,
  showWarnings: true,
  autoBlock: false
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Web3 Anti-Phishing Guardian installed');
  await loadThreatIntelligence();
  await loadUserSettings();
  
  // Set up periodic updates (every 6 hours)
  chrome.alarms.create('updateThreatIntel', { periodInMinutes: 360 });
});

// Listen for alarm to update threat intelligence
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateThreatIntel') {
    loadThreatIntelligence();
  }
});

// Load threat intelligence from various sources
async function loadThreatIntelligence() {
  try {
    // Load MetaMask phishing list
    const response = await fetch('https://raw.githubusercontent.com/MetaMask/eth-phishing-detect/master/src/config.json');
    const data = await response.json();
    
    if (data.blacklist) {
      data.blacklist.forEach(domain => phishingDomains.add(domain));
    }
    
    console.log(`Loaded ${phishingDomains.size} phishing domains`);
    
    // Store in chrome.storage for persistence
    await chrome.storage.local.set({ 
      phishingDomains: Array.from(phishingDomains),
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Error loading threat intelligence:', error);
    
    // Load from local storage as fallback
    const stored = await chrome.storage.local.get(['phishingDomains']);
    if (stored.phishingDomains) {
      phishingDomains = new Set(stored.phishingDomains);
    }
  }
  
  // Load trusted dApps list
  loadTrustedDapps();
  
  // Load malicious addresses
  loadMaliciousAddresses();
}

// Load trusted dApps (whitelist)
function loadTrustedDapps() {
  const trustedList = [
    'uniswap.org',
    'app.uniswap.org',
    'opensea.io',
    'etherscan.io',
    'metamask.io',
    'coinbase.com',
    'binance.com',
    'aave.com',
    'compound.finance',
    'curve.fi',
    'pancakeswap.finance'
  ];
  
  trustedList.forEach(domain => trustedDapps.add(domain));
}

// Load known malicious addresses
async function loadMaliciousAddresses() {
  // In production, this would fetch from an API
  const stored = await chrome.storage.local.get(['maliciousAddresses']);
  if (stored.maliciousAddresses) {
    maliciousAddresses = new Set(stored.maliciousAddresses);
  }
}

// Load user settings
async function loadUserSettings() {
  const stored = await chrome.storage.sync.get(['settings']);
  if (stored.settings) {
    userSettings = { ...userSettings, ...stored.settings };
  }
}

// Check if domain is phishing
function isDomainPhishing(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check exact match
    if (phishingDomains.has(hostname)) {
      return { isPhishing: true, reason: 'Known phishing domain', severity: 'critical' };
    }
    
    // Check for homograph attacks (Punycode/IDN)
    if (hostname.includes('xn--')) {
      const decoded = decodeIDN(hostname);
      if (decoded !== hostname) {
        return { isPhishing: true, reason: 'Suspicious IDN/Punycode domain', severity: 'high' };
      }
    }
    
    // Check similarity to trusted dApps
    for (const trusted of trustedDapps) {
      const similarity = calculateStringSimilarity(hostname, trusted);
      if (similarity > 0.85 && hostname !== trusted) {
        return { 
          isPhishing: true, 
          reason: `Suspicious similarity to ${trusted}`, 
          severity: 'high',
          similarTo: trusted
        };
      }
    }
    
    return { isPhishing: false };
  } catch (error) {
    console.error('Error checking domain:', error);
    return { isPhishing: false };
  }
}

// Decode IDN (Internationalized Domain Names)
function decodeIDN(hostname) {
  try {
    return new URL(`http://${hostname}`).hostname;
  } catch {
    return hostname;
  }
}

// Calculate string similarity (Levenshtein distance)
function calculateStringSimilarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - (distance / maxLen);
}

// Check if address is malicious
function isAddressMalicious(address) {
  if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return { isMalicious: false };
  }
  
  const lowerAddress = address.toLowerCase();
  
  if (maliciousAddresses.has(lowerAddress)) {
    return { isMalicious: true, reason: 'Known malicious address', severity: 'critical' };
  }
  
  return { isMalicious: false };
}

// Check address similarity for poisoning detection
async function checkAddressPoisoning(address, userAddresses) {
  if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return { isPoisoning: false };
  }
  
  for (const trustedAddr of userAddresses) {
    const similarity = calculateAddressSimilarity(address, trustedAddr);
    
    // Check for high similarity (potential poisoning)
    if (similarity > 0.8 && address.toLowerCase() !== trustedAddr.toLowerCase()) {
      return {
        isPoisoning: true,
        reason: `Address is ${(similarity * 100).toFixed(0)}% similar to your trusted address`,
        severity: 'high',
        similarTo: trustedAddr,
        similarity: similarity
      };
    }
  }
  
  return { isPoisoning: false };
}

// Calculate address similarity
function calculateAddressSimilarity(addr1, addr2) {
  if (!addr1 || !addr2) return 0;
  
  const a1 = addr1.toLowerCase();
  const a2 = addr2.toLowerCase();
  
  // Check prefix and suffix similarity (common poisoning technique)
  const prefixLen = 6; // First 6 chars after 0x
  const suffixLen = 4;  // Last 4 chars
  
  const prefix1 = a1.substring(2, 2 + prefixLen);
  const prefix2 = a2.substring(2, 2 + prefixLen);
  const suffix1 = a1.substring(a1.length - suffixLen);
  const suffix2 = a2.substring(a2.length - suffixLen);
  
  let matches = 0;
  const totalChars = 40; // Address length without 0x
  
  // Count matching characters
  for (let i = 2; i < a1.length; i++) {
    if (a1[i] === a2[i]) matches++;
  }
  
  const similarity = matches / totalChars;
  
  // Boost similarity if prefix or suffix matches exactly
  if (prefix1 === prefix2 || suffix1 === suffix2) {
    return Math.min(similarity + 0.2, 1);
  }
  
  return similarity;
}

// Analyze transaction risk
async function analyzeTransaction(tx, userAddresses = []) {
  const risks = [];
  let riskScore = 0;
  
  // Check recipient address
  if (tx.to) {
    const maliciousCheck = isAddressMalicious(tx.to);
    if (maliciousCheck.isMalicious) {
      risks.push({
        type: 'malicious_address',
        severity: maliciousCheck.severity,
        message: `Recipient is a ${maliciousCheck.reason}`
      });
      riskScore += 50;
    }
    
    // Check for address poisoning
    if (userAddresses.length > 0) {
      const poisoningCheck = await checkAddressPoisoning(tx.to, userAddresses);
      if (poisoningCheck.isPoisoning) {
        risks.push({
          type: 'address_poisoning',
          severity: poisoningCheck.severity,
          message: poisoningCheck.reason,
          similarTo: poisoningCheck.similarTo
        });
        riskScore += 40;
      }
    }
  }
  
  // Check transaction value
  if (tx.value) {
    const valueInEth = parseInt(tx.value, 16) / 1e18;
    if (valueInEth > 1) {
      risks.push({
        type: 'high_value',
        severity: 'medium',
        message: `High value transaction: ${valueInEth.toFixed(4)} ETH`
      });
      riskScore += 10;
    }
  }
  
  // Check for suspicious data
  if (tx.data && tx.data !== '0x') {
    // Check for unlimited approval (common scam)
    if (tx.data.includes('ffffffff')) {
      risks.push({
        type: 'unlimited_approval',
        severity: 'high',
        message: 'Transaction contains unlimited token approval'
      });
      riskScore += 35;
    }
  }
  
  // Determine overall risk level
  let riskLevel = 'safe';
  if (riskScore >= 50) riskLevel = 'critical';
  else if (riskScore >= 30) riskLevel = 'high';
  else if (riskScore >= 15) riskLevel = 'medium';
  else if (riskScore > 0) riskLevel = 'low';
  
  return {
    riskLevel,
    riskScore,
    risks,
    shouldBlock: riskScore >= 50 && userSettings.autoBlock
  };
}

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.type) {
        case 'checkDomain':
          const domainResult = isDomainPhishing(request.url);
          sendResponse(domainResult);
          break;
          
        case 'checkAddress':
          const addrResult = isAddressMalicious(request.address);
          sendResponse(addrResult);
          break;
          
        case 'checkPoisoning':
          const poisoningResult = await checkAddressPoisoning(
            request.address, 
            request.userAddresses || []
          );
          sendResponse(poisoningResult);
          break;
          
        case 'analyzeTransaction':
          const txResult = await analyzeTransaction(
            request.transaction,
            request.userAddresses || []
          );
          sendResponse(txResult);
          break;
          
        case 'getSettings':
          sendResponse({ settings: userSettings });
          break;
          
        case 'updateSettings':
          userSettings = { ...userSettings, ...request.settings };
          await chrome.storage.sync.set({ settings: userSettings });
          sendResponse({ success: true });
          break;
          
        case 'addTrustedAddress':
          const stored = await chrome.storage.local.get(['trustedAddresses']) || {};
          const trustedAddresses = stored.trustedAddresses || [];
          if (!trustedAddresses.includes(request.address)) {
            trustedAddresses.push(request.address);
            await chrome.storage.local.set({ trustedAddresses });
          }
          sendResponse({ success: true });
          break;
          
        case 'getTrustedAddresses':
          const data = await chrome.storage.local.get(['trustedAddresses']);
          sendResponse({ addresses: data.trustedAddresses || [] });
          break;
          
        case 'reportPhishing':
          // Store report and optionally send to backend
          const reports = await chrome.storage.local.get(['reports']) || {};
          const reportList = reports.reports || [];
          reportList.push({
            url: request.url,
            address: request.address,
            timestamp: Date.now(),
            reason: request.reason
          });
          await chrome.storage.local.set({ reports: reportList });
          
          // Add to local blocklist
          if (request.url) {
            const url = new URL(request.url);
            phishingDomains.add(url.hostname);
          }
          if (request.address) {
            maliciousAddresses.add(request.address.toLowerCase());
          }
          
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ error: 'Unknown request type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  })();
  
  return true; // Keep channel open for async response
});

// Tab monitoring
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const check = isDomainPhishing(tab.url);
    if (check.isPhishing) {
      // Send warning to content script
      chrome.tabs.sendMessage(tabId, {
        type: 'domainWarning',
        data: check
      }).catch(() => {
        // Content script might not be ready yet
      });
    }
  }
});

console.log('Web3 Anti-Phishing Guardian background service initialized');
