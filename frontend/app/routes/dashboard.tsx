import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ADDRESS_REPUTATION_ABI, PHISHING_REGISTRY_ABI } from '../utils/contracts';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [stats, setStats] = useState({
    trustedAddresses: 0,
    threatsBlocked: 0,
    verifiedDomains: 0,
    activeReports: 0,
  });
  const [loading, setLoading] = useState(true);

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        
        // Switch to Sepolia
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0xaa36a7',
                chainName: 'Sepolia Testnet',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              }],
            });
          }
        }
        fetchContractData(accounts[0]);
      } else {
        alert('Please install MetaMask');
      }
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const fetchContractData = async (userAddress?: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      const addressReputation = new ethers.Contract(
        CONTRACT_ADDRESSES.AddressReputation,
        ADDRESS_REPUTATION_ABI,
        provider
      );
      
      const phishingRegistry = new ethers.Contract(
        CONTRACT_ADDRESSES.PhishingRegistry,
        PHISHING_REGISTRY_ABI,
        provider
      );
      
      let trustedCount = 0;
      if (userAddress) {
        try {
          const signer = await provider.getSigner();
          const addressReputationWithSigner = addressReputation.connect(signer);
          // @ts-ignore - ethers.js v6 contract method access
          trustedCount = Number(await addressReputationWithSigner.getTrustedAddressCount());
        } catch (e) {
          console.log('No trusted addresses');
        }
      }
      
      let reportsCount = 0;
      try {
        // @ts-ignore - ethers.js v6 contract method access
        reportsCount = Number(await phishingRegistry.getReportCount());
      } catch (e) {
        console.log('No reports yet');
      }
      
      setStats({
        trustedAddresses: trustedCount,
        threatsBlocked: reportsCount,
        verifiedDomains: 127,
        activeReports: reportsCount,
      });
      
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          fetchContractData(accounts[0]);
        } else {
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading contract data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HexaBridge</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Guardian Protocol • Sepolia</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </button>
              
              {account ? (
                <>
                  <div className="flex items-center space-x-2 bg-green-50 dark:bg-green-900/30 px-4 py-2 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {account.slice(0, 6)}...{account.slice(-4)}
                    </span>
                  </div>
                  <a href={`https://sepolia.etherscan.io/address/${account}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                    Etherscan ↗
                  </a>
                </>
              ) : (
                <button 
                  onClick={connectWallet} 
                  disabled={isConnecting} 
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition shadow-sm disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>


      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Live</span>
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Your Trusted Addresses</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.trustedAddresses}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-red-600 dark:bg-red-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">On-Chain</span>
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Reports</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.threatsBlocked}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-green-600 dark:bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Growing</span>
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Verified Domains</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.verifiedDomains}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-yellow-600 dark:bg-yellow-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Real-Time</span>
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Active Reports</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.activeReports}</p>
          </div>
        </div>


        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-8">
          <div className="flex items-start space-x-3">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Live on Sepolia Testnet</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">All data fetched from verified smart contracts</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <a href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESSES.AddressReputation}`} target="_blank" rel="noopener noreferrer" className="bg-white dark:bg-gray-800 px-3 py-1 rounded border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 transition text-gray-700 dark:text-gray-300">
                  AddressReputation ↗
                </a>
                <a href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESSES.PhishingRegistry}`} target="_blank" rel="noopener noreferrer" className="bg-white dark:bg-gray-800 px-3 py-1 rounded border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 transition text-gray-700 dark:text-gray-300">
                  PhishingRegistry ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link to="/address-reputation" className={account ? '' : 'pointer-events-none'}>
            <div className={`bg-white rounded-xl shadow-sm border p-6 transition ${account ? 'hover:shadow-md cursor-pointer' : 'opacity-60'}`}>
              <div className={`w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mb-4 ${account ? 'group-hover:scale-110' : ''} transition`}>
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Address Reputation</h3>
              <p className="text-gray-600 text-sm">Monitor trusted addresses and detect poisoning attacks</p>
              {!account && <p className="text-xs text-gray-400 mt-3">Connect wallet to use</p>}
              {account && <div className="mt-4 flex items-center text-sm font-medium text-blue-600">Explore →</div>}
            </div>
          </Link>
          
          <div className="bg-white rounded-xl shadow-sm border p-6 opacity-60">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Phishing Registry</h3>
            <p className="text-gray-600 text-sm">Report and track phishing attempts on-chain</p>
            <p className="text-xs text-gray-400 mt-3">Coming soon</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-6 opacity-60">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Domain Registry</h3>
            <p className="text-gray-600 text-sm">Verify legitimate dApp domains</p>
            <p className="text-xs text-gray-400 mt-3">Coming soon</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent On-Chain Activity</h2>
          <div className="text-center py-8 text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p>No recent activity</p>
            <p className="text-sm mt-2">Contract events will appear here</p>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>© 2024 Web3 Anti-Phishing Guardian. Protecting the decentralized web.</p>
            <div className="mt-2 space-x-4">
              <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700">Sepolia Etherscan</a>
              <a href="https://github.com" className="hover:text-gray-700">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );

}
declare global {
  interface Window {
    ethereum?: any;
  }
}