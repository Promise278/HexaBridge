import { useMemo } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ADDRESS_REPUTATION_ABI, PHISHING_REGISTRY_ABI, DOMAIN_REGISTRY_ABI } from '../utils/contracts';

export function useContract(contractName: string, abi: any) {
  return useMemo(() => {
    if (typeof window === 'undefined' || !window.ethereum) return null;
    
    const provider = new ethers.BrowserProvider(window.ethereum);
    const address = CONTRACT_ADDRESSES[contractName as keyof typeof CONTRACT_ADDRESSES];
    
    if (!address) return null;
    
    return new ethers.Contract(address, abi, provider);
  }, [contractName, abi]);
}

export function useAddressReputation() {
  return useContract('AddressReputation', ADDRESS_REPUTATION_ABI);
}

export function usePhishingRegistry() {
  return useContract('PhishingRegistry', PHISHING_REGISTRY_ABI);
}

export function useDomainRegistry() {
  return useContract('DomainRegistry', DOMAIN_REGISTRY_ABI);
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
