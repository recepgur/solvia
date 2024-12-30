import { API_CONFIG } from './config';

export async function fetchWithRetry(url, options = {}) {
    let lastError;
    const { attempts, delay, backoff } = API_CONFIG.RETRY;
    
    for (let i = 0; i < attempts; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            lastError = error;
            
            if (i < attempts - 1) {
                // Wait with exponential backoff before retrying
                await new Promise(resolve => 
                    setTimeout(resolve, delay * Math.pow(backoff, i))
                );
            }
        }
    }
    
    throw lastError;
}

export function handleNetworkError(error) {
    if (error.name === 'AbortError') {
        return 'Request timed out. Please check your internet connection and try again.';
    }
    
    if (!navigator.onLine) {
        return 'You are offline. Please check your internet connection and try again.';
    }
    
    return error.message || 'An unexpected network error occurred. Please try again.';
}
