const express = require('express');
const { protect } = require('../middleware/auth');
const { getCountriesAndCurrencies, getPopularCurrencies, convertCurrency, getExchangeRate } = require('../utils/currency');

const router = express.Router();

// @desc    Get countries and their currencies
// @route   GET /api/currencies/countries
// @access  Private
router.get('/countries', protect, async (req, res) => {
  try {
    const countries = await getCountriesAndCurrencies();
    
    res.status(200).json({
      status: 'success',
      results: countries.length,
      data: {
        countries
      }
    });
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch countries and currencies'
    });
  }
});

// @desc    Get popular currencies
// @route   GET /api/currencies/popular
// @access  Private
router.get('/popular', protect, async (req, res) => {
  try {
    const currencies = getPopularCurrencies();
    
    res.status(200).json({
      status: 'success',
      results: currencies.length,
      data: {
        currencies
      }
    });
  } catch (error) {
    console.error('Get popular currencies error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch popular currencies'
    });
  }
});

// @desc    Convert currency
// @route   POST /api/currencies/convert
// @access  Private
router.post('/convert', protect, async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount, fromCurrency, and toCurrency are required'
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Amount must be a positive number'
      });
    }

    if (fromCurrency.length !== 3 || toCurrency.length !== 3) {
      return res.status(400).json({
        status: 'error',
        message: 'Currency codes must be 3 characters long'
      });
    }

    const conversion = await convertCurrency(
      parseFloat(amount),
      fromCurrency.toUpperCase(),
      toCurrency.toUpperCase()
    );

    res.status(200).json({
      status: 'success',
      data: {
        conversion
      }
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Currency conversion failed'
    });
  }
});

// @desc    Get exchange rate
// @route   GET /api/currencies/rate/:from/:to
// @access  Private
router.get('/rate/:from/:to', protect, async (req, res) => {
  try {
    const { from, to } = req.params;

    if (from.length !== 3 || to.length !== 3) {
      return res.status(400).json({
        status: 'error',
        message: 'Currency codes must be 3 characters long'
      });
    }

    const rate = await getExchangeRate(from.toUpperCase(), to.toUpperCase());

    res.status(200).json({
      status: 'success',
      data: {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate
      }
    });
  } catch (error) {
    console.error('Get exchange rate error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to get exchange rate'
    });
  }
});

// @desc    Get exchange rates for multiple currencies
// @route   POST /api/currencies/rates
// @access  Private
router.post('/rates', protect, async (req, res) => {
  try {
    const { baseCurrency, targetCurrencies } = req.body;

    if (!baseCurrency || !targetCurrencies || !Array.isArray(targetCurrencies)) {
      return res.status(400).json({
        status: 'error',
        message: 'baseCurrency and targetCurrencies array are required'
      });
    }

    if (baseCurrency.length !== 3) {
      return res.status(400).json({
        status: 'error',
        message: 'Base currency code must be 3 characters long'
      });
    }

    const rates = {};
    
    // Get rates for all target currencies
    for (const currency of targetCurrencies) {
      if (currency.length === 3) {
        try {
          const rate = await getExchangeRate(baseCurrency.toUpperCase(), currency.toUpperCase());
          rates[currency.toUpperCase()] = rate;
        } catch (error) {
          console.error(`Error getting rate for ${currency}:`, error);
          rates[currency.toUpperCase()] = null;
        }
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        baseCurrency: baseCurrency.toUpperCase(),
        rates
      }
    });
  } catch (error) {
    console.error('Get multiple exchange rates error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get exchange rates'
    });
  }
});

module.exports = router;
