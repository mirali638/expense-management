const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Configure multer for OCR file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads/ocr';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ocr-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed for OCR'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  },
  fileFilter: fileFilter
});

// @desc    Extract text from receipt image using OCR
// @route   POST /api/ocr/extract
// @access  Private
router.post('/extract', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No image file provided'
      });
    }

    // Perform OCR on the uploaded image
    const { data: { text } } = await Tesseract.recognize(
      req.file.path,
      'eng',
      {
        logger: m => console.log(m) // Optional: log OCR progress
      }
    );

    // Parse the extracted text to find expense information
    const parsedData = parseReceiptText(text);

    // Clean up the uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (error) {
      console.error('Error deleting OCR file:', error);
    }

    res.status(200).json({
      status: 'success',
      data: {
        extractedText: text,
        parsedData
      }
    });
  } catch (error) {
    console.error('OCR extraction error:', error);
    
    // Clean up the uploaded file in case of error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error deleting OCR file after error:', cleanupError);
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to extract text from image'
    });
  }
});

// @desc    Extract expense data from receipt image
// @route   POST /api/ocr/expense
// @access  Private
router.post('/expense', protect, upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No receipt image provided'
      });
    }

    // Perform OCR on the receipt image
    const { data: { text } } = await Tesseract.recognize(
      req.file.path,
      'eng',
      {
        logger: m => console.log(m)
      }
    );

    // Parse the extracted text to find expense information
    const expenseData = parseReceiptForExpense(text);

    // Clean up the uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (error) {
      console.error('Error deleting OCR file:', error);
    }

    res.status(200).json({
      status: 'success',
      data: {
        extractedText: text,
        expenseData
      }
    });
  } catch (error) {
    console.error('OCR expense extraction error:', error);
    
    // Clean up the uploaded file in case of error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error deleting OCR file after error:', cleanupError);
      }
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to extract expense data from receipt'
    });
  }
});

// Helper function to parse receipt text for general information
function parseReceiptText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const parsedData = {
    merchant: '',
    date: '',
    total: '',
    items: [],
    address: '',
    phone: '',
    email: ''
  };

  // Common patterns for different receipt elements
  const patterns = {
    // Date patterns
    date: /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/,
    
    // Currency patterns
    currency: /[\$€£¥₹]\s*(\d+\.?\d*)/,
    
    // Phone patterns
    phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    
    // Email patterns
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    
    // Total patterns
    total: /(total|amount|sum|grand total)[:\s]*[\$€£¥₹]?\s*(\d+\.?\d*)/i
  };

  // Extract merchant name (usually first line or line with business indicators)
  const businessIndicators = ['ltd', 'inc', 'corp', 'company', 'restaurant', 'cafe', 'store', 'shop'];
  for (const line of lines) {
    if (businessIndicators.some(indicator => line.toLowerCase().includes(indicator))) {
      parsedData.merchant = line;
      break;
    }
  }
  if (!parsedData.merchant && lines.length > 0) {
    parsedData.merchant = lines[0];
  }

  // Extract date
  for (const line of lines) {
    const dateMatch = line.match(patterns.date);
    if (dateMatch) {
      parsedData.date = dateMatch[1];
      break;
    }
  }

  // Extract total amount
  for (const line of lines) {
    const totalMatch = line.match(patterns.total);
    if (totalMatch) {
      parsedData.total = totalMatch[2];
      break;
    }
  }

  // Extract phone and email
  for (const line of lines) {
    const phoneMatch = line.match(patterns.phone);
    if (phoneMatch && !parsedData.phone) {
      parsedData.phone = phoneMatch[0];
    }
    
    const emailMatch = line.match(patterns.email);
    if (emailMatch && !parsedData.email) {
      parsedData.email = emailMatch[0];
    }
  }

  return parsedData;
}

// Helper function to parse receipt text specifically for expense data
function parseReceiptForExpense(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const expenseData = {
    amount: '',
    currency: 'USD',
    description: '',
    category: 'Other',
    merchant: '',
    date: '',
    confidence: 0
  };

  // Common currency symbols and their codes
  const currencyMap = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₹': 'INR',
    'C$': 'CAD',
    'A$': 'AUD'
  };

  // Amount patterns (more specific for expenses)
  const amountPatterns = [
    /[\$€£¥₹]\s*(\d+\.?\d*)/, // Currency symbol followed by amount
    /(\d+\.?\d*)\s*[\$€£¥₹]/, // Amount followed by currency symbol
    /total[:\s]*[\$€£¥₹]?\s*(\d+\.?\d*)/i,
    /amount[:\s]*[\$€£¥₹]?\s*(\d+\.?\d*)/i,
    /sum[:\s]*[\$€£¥₹]?\s*(\d+\.?\d*)/i
  ];

  // Extract amount and currency
  for (const line of lines) {
    for (const pattern of amountPatterns) {
      const match = line.match(pattern);
      if (match) {
        expenseData.amount = match[1];
        
        // Extract currency symbol
        const currencySymbol = line.match(/[\$€£¥₹C$A$]/);
        if (currencySymbol) {
          expenseData.currency = currencyMap[currencySymbol[0]] || 'USD';
        }
        break;
      }
    }
    if (expenseData.amount) break;
  }

  // Extract merchant name
  const businessIndicators = ['ltd', 'inc', 'corp', 'company', 'restaurant', 'cafe', 'store', 'shop', 'hotel', 'gas', 'station'];
  for (const line of lines) {
    if (businessIndicators.some(indicator => line.toLowerCase().includes(indicator))) {
      expenseData.merchant = line;
      break;
    }
  }
  if (!expenseData.merchant && lines.length > 0) {
    expenseData.merchant = lines[0];
  }

  // Extract date
  const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/;
  for (const line of lines) {
    const dateMatch = line.match(datePattern);
    if (dateMatch) {
      expenseData.date = dateMatch[1];
      break;
    }
  }

  // Generate description from merchant and context
  if (expenseData.merchant) {
    expenseData.description = `Expense at ${expenseData.merchant}`;
  } else {
    expenseData.description = 'Receipt expense';
  }

  // Categorize based on merchant name
  const merchantLower = expenseData.merchant.toLowerCase();
  if (merchantLower.includes('restaurant') || merchantLower.includes('cafe') || merchantLower.includes('food')) {
    expenseData.category = 'Meals';
  } else if (merchantLower.includes('hotel') || merchantLower.includes('accommodation')) {
    expenseData.category = 'Accommodation';
  } else if (merchantLower.includes('gas') || merchantLower.includes('fuel') || merchantLower.includes('station')) {
    expenseData.category = 'Transportation';
  } else if (merchantLower.includes('office') || merchantLower.includes('supplies')) {
    expenseData.category = 'Office Supplies';
  } else if (merchantLower.includes('travel') || merchantLower.includes('airline') || merchantLower.includes('taxi')) {
    expenseData.category = 'Travel';
  }

  // Calculate confidence based on extracted data
  let confidence = 0;
  if (expenseData.amount) confidence += 40;
  if (expenseData.merchant) confidence += 30;
  if (expenseData.date) confidence += 20;
  if (expenseData.currency !== 'USD') confidence += 10;
  
  expenseData.confidence = confidence;

  return expenseData;
}

module.exports = router;
