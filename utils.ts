export const formatMoney = (amount: number): string => {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 0,
  }).format(amount).replace('MYR', 'RM');
};

export const formatDate = (dateStr: string): string => {
  return dateStr; // Already YYYY-MM-DD, keeping as is for table compactness or use format if needed
};
