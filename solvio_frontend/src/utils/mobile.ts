export const detectMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const forceMobile = new URLSearchParams(window.location.search).get('forceMobile') === 'true';
  if (forceMobile) return true;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};
