const axios = require('axios');

// Cache for currency exchange rates
const exchangeRateCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Get exchange rate from API
const getExchangeRate = async (fromCurrency, toCurrency) => {
  try {
    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const cached = exchangeRateCache.get(cacheKey);
    
    // Return cached rate if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.rate;
    }
    
    const response = await axios.get(
      `${process.env.EXCHANGE_RATE_API}/${fromCurrency}`
    );
    
    const rate = response.data.rates[toCurrency];
    
    if (!rate) {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }
    
    // Cache the rate
    exchangeRateCache.set(cacheKey, {
      rate,
      timestamp: Date.now()
    });
    
    return rate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error.message);
    throw new Error(`Failed to get exchange rate: ${error.message}`);
  }
};

// Convert amount from one currency to another
const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) {
    return {
      convertedAmount: amount,
      exchangeRate: 1,
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedCurrency: toCurrency
    };
  }
  
  try {
    const exchangeRate = await getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * exchangeRate;
    
    return {
      convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
      exchangeRate,
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedCurrency: toCurrency
    };
  } catch (error) {
    throw new Error(`Currency conversion failed: ${error.message}`);
  }
};

// Get list of countries and their currencies
const getCountriesAndCurrencies = async () => {
  try {
    const response = await axios.get(process.env.REST_COUNTRIES_API);
    
    const countries = response.data.map(country => ({
      name: country.name.common,
      officialName: country.name.official,
      currencies: Object.keys(country.currencies || {}).map(currencyCode => ({
        code: currencyCode,
        name: country.currencies[currencyCode].name,
        symbol: country.currencies[currencyCode].symbol
      }))
    }));
    
    return countries;
  } catch (error) {
    console.error('Error fetching countries and currencies:', error.message);
    throw new Error('Failed to fetch countries and currencies');
  }
};

// Get popular currencies
const getPopularCurrencies = () => {
  return [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' }
  ];
};

// Format currency amount
const formatCurrency = (amount, currencyCode, locale = 'en-US') => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
};

module.exports = {
  getExchangeRate,
  convertCurrency,
  getCountriesAndCurrencies,
  getPopularCurrencies,
  formatCurrency
};
