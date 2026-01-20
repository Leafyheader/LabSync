import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/calculations';

interface PrintPreviewProps {
  transaction: Transaction;
  onClose: () => void;
  onPrint: () => void;
}

interface Printer {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

declare global {
  interface Window {
    electronAPI?: {
      getPrinters: () => Promise<Printer[]>;
      printContent: (options: { html: string; printerName: string }) => Promise<{ success: boolean; error?: string }>;
      getStoredPrinter: () => Promise<string | null>;
      storePrinter: (printerName: string) => Promise<void>;
    };
  }
}

const PrintPreview: React.FC<PrintPreviewProps> = ({ transaction, onClose, onPrint }) => {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printError, setPrintError] = useState<string>('');

  useEffect(() => {
    const fetchPrinters = async () => {
      if (window.electronAPI?.getPrinters) {
        try {
          const availablePrinters = await window.electronAPI.getPrinters();
          setPrinters(availablePrinters);
          
          // Try to get stored printer preference first
          let storedPrinter = null;
          if (window.electronAPI.getStoredPrinter) {
            storedPrinter = await window.electronAPI.getStoredPrinter();
          }
          
          // Set stored printer if it exists and is available
          if (storedPrinter && availablePrinters.find(p => p.name === storedPrinter)) {
            setSelectedPrinter(storedPrinter);
          } else {
            // Fallback to default printer
            const defaultPrinter = availablePrinters.find(p => p.isDefault);
            if (defaultPrinter) {
              setSelectedPrinter(defaultPrinter.name);
            } else if (availablePrinters.length > 0) {
              setSelectedPrinter(availablePrinters[0].name);
            }
          }
        } catch (error) {
          console.error('Error fetching printers:', error);
          setPrintError('Failed to fetch available printers');
        }
      }
    };

    fetchPrinters();
  }, []);

  const generateReceiptHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt</title>
        <style>
          @page {
            margin: 0;
            size: 80mm auto;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 16px;
            line-height: 1.3;
            color: #000;
            background: white;
            width: 80mm;
            padding: 1mm 2mm;
            overflow-wrap: break-word;
            word-wrap: break-word;
          }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .text-lg { font-size: 18px; }
          .text-xs { font-size: 10px; }
          .mb-1 { margin-bottom: 1px; }
          .mb-2 { margin-bottom: 2px; }
          .mt-1 { margin-top: 1px; }
          .mt-2 { margin-top: 2px; }
          .pt-1 { padding-top: 1px; }
          .grid { display: grid; }
          .grid-cols-2 { grid-template-columns: 1fr 1fr; }
          .grid-cols-3 { grid-template-columns: 1fr 1fr 1fr; }
          .border-t { border-top: 1px solid black; }
          .border-b { border-bottom: 1px solid black; }
          img {
            max-width: 60px;
            max-height: 60px;
            width: auto;
            height: auto;
            margin: 0 auto;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="text-center mb-1">
          <div class="mb-2">
            <img src="./logo/Logo.jpg" alt="Brother Diagnostic Center Logo" />
          </div>
          <div class="border-b mb-1">
            <h1 class="text-lg font-bold mb-1">BROTHER DIAGNOSTIC CENTER</h1>
          </div>
          <p class="text-xs mb-0">
            Loc: Opp. Goil Filling Station, Beposo. Shama Mun. Tel: +233 0208822856, +233 0530440172 
          </p>
        </div>

        <div class="grid grid-cols-2 mb-1 text-xs">
          <div class="text-left">
            <span>Receipt #: ${transaction.referenceNumber}</span>
          </div>
          <div class="text-right">
            <span>Customer: ${transaction.customer.name}</span>
          </div>
        </div>

        <div class="grid grid-cols-3 mb-2 text-xs">
          <div class="text-left">
            <span>Date: ${formatDate(transaction.date)}</span>
          </div>
          <div class="text-center font-bold">
            <span>RECEIPT</span>
          </div>
          <div class="text-right">
            ${transaction.customer.phone ? `<span>Phone: ${transaction.customer.phone}</span>` : ''}
          </div>
        </div>

        <div style="width: 100%; border: 1px solid black;">
          <div style="display: grid; grid-template-columns: 60% 20% 20%; border-top: 1px solid black; border-bottom: 1px solid black;">
            <div style="padding: 2px; border-right: 1px solid black; font-weight: bold; font-size: 13px;">Test</div>
            <div style="padding: 2px; border-right: 1px solid black; text-align: center; font-weight: bold; font-size: 13px;">Qty</div>
            <div style="padding: 2px; text-align: center; font-weight: bold; font-size: 13px;">Amount</div>
          </div>

          ${transaction.selectedTests.map(({ test, quantity }) => `
            <div style="display: grid; grid-template-columns: 60% 20% 20%; border-bottom: 1px solid black;">
              <div style="padding: 2px; border-right: 1px solid black; font-size: 14px;">${test.name || 'Unknown Test'}</div>
              <div style="padding: 2px; border-right: 1px solid black; text-align: center; font-size: 13px;">${quantity || 0}</div>
              <div style="padding: 2px; text-align: center; font-size: 13px;">${((test.price || 0) * (quantity || 0)).toFixed(2)}</div>
            </div>
          `).join('')}
        </div>

        <div class="border-t mt-1 pt-1" style="display: flex; justify-content: flex-end; width: 100%;">
          <div style="display: flex; align-items: center; gap: 8px; padding: 2px; font-weight: bold; font-size: 16px; white-space: nowrap;">
            <span>Total:</span>
            <span>${formatCurrency(transaction.totalCost)}</span>
          </div>
        </div>

        <div class="text-xs mt-2 mb-2">
          <p class="font-bold">Payment Method:</p>
          <p>${transaction.paymentMethod === 'momo' ? 'Mobile Money' : 'Cash'}</p>
        </div>

        <div class="mt-2 text-center text-xs">
          <p>Thank you for your business!</p>
          <p>Please keep this receipt for collection</p>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrint = async () => {
    if (!selectedPrinter) {
      setPrintError('Please select a printer');
      return;
    }

    if (!window.electronAPI?.printContent) {
      setPrintError('Printing not available - please use browser print');
      // Fallback to regular print
      onPrint();
      return;
    }

    setIsPrinting(true);
    setPrintError('');

    try {
      const html = generateReceiptHTML();
      const result = await window.electronAPI.printContent({
        html,
        printerName: selectedPrinter
      });

      if (result.success) {
        onClose(); // Close the preview after successful print
      } else {
        setPrintError(result.error || 'Print failed');
      }
    } catch (error) {
      console.error('Print error:', error);
      setPrintError('Print operation failed');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleFallbackPrint = () => {
    // Use the original print method as fallback
    onPrint();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Print Receipt</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="mb-4 p-4 border border-gray-200 rounded bg-gray-50 max-h-96 overflow-y-auto">
          {/* Full Receipt Content Preview */}
          <div 
            style={{
              width: '80mm',
              fontFamily: 'Arial',
              fontSize: '16px',
              lineHeight: '1.3',
              padding: '1mm 2mm',
              margin: '0 auto',
              boxSizing: 'border-box',
              overflowWrap: 'break-word',
              wordWrap: 'break-word',
              transform: 'scale(0.8)',
              transformOrigin: 'top center'
            }}
          >
            {/* Logo and Business Name */}
            <div className="w-full text-center" style={{ marginBottom: '1px' }}>
              <div style={{ marginBottom: '2px' }}>
                <img 
                  src="./logo/Logo.jpg" 
                  alt="Brother Diagnostic Center Logo" 
                  style={{
                    maxWidth: '60px',
                    maxHeight: '60px',
                    width: 'auto',
                    height: 'auto',
                    margin: '0 auto',
                    display: 'block'
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
              
              <div style={{ borderBottom: '1px solid black', marginBottom: '1px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '1px' }}>
                  BROTHER DIAGNOSTIC CENTER
                </h1>
              </div>
              <p style={{ fontSize: '10px', marginBottom: 0 }}>
                Loc: Opp. Goil Filling Station, Beposo. Shama Mun. Tel: +233 0208822856, +233 0530440172 
              </p>
            </div>

            {/* Receipt Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: '1px', fontSize: '10px' }}>
              <div style={{ textAlign: 'left' }}>
                <span>Receipt #: {transaction.referenceNumber}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span>Customer: {transaction.customer.name}</span>
              </div>
            </div>

            {/* Date and Label */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', marginBottom: '2px', fontSize: '10px' }}>
              <div style={{ textAlign: 'left' }}>
                <span>Date: {formatDate(transaction.date)}</span>
              </div>
              <div style={{ textAlign: 'center', fontWeight: 'bold' }}>
                <span>RECEIPT</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                {transaction.customer.phone && <span>Phone: {transaction.customer.phone}</span>}
              </div>
            </div>

            {/* Table */}
            <div style={{ width: '100%', border: '1px solid black' }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '60% 20% 20%',
                borderTop: '1px solid black',
                borderBottom: '1px solid black',
              }}>
                <div style={{ padding: '2px', borderRight: '1px solid black', fontWeight: 'bold', fontSize: '13px' }}>Test</div>
                <div style={{ padding: '2px', borderRight: '1px solid black', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>Qty</div>
                <div style={{ padding: '2px', textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>Amount</div>
              </div>

              {/* Table Items */}
              {transaction.selectedTests.map(({ test, quantity }) => (
                <div
                  key={test.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60% 20% 20%',
                    borderBottom: '1px solid black',
                  }}
                >
                  <div style={{ padding: '2px', borderRight: '1px solid black', fontSize: '14px' }}>{test.name || 'Unknown Test'}</div>
                  <div style={{ padding: '2px', borderRight: '1px solid black', textAlign: 'center', fontSize: '13px' }}>{quantity || 0}</div>
                  <div style={{ padding: '2px', textAlign: 'center', fontSize: '13px' }}>{((test.price || 0) * (quantity || 0)).toFixed(2)}</div>
                </div>
              ))}
            </div>

            {/* Total Section */}
            <div style={{ borderTop: '1px solid black', marginTop: '1px', paddingTop: '1px', display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '2px', fontWeight: 'bold', fontSize: '16px', whiteSpace: 'nowrap' }}>
                <span>Total:</span>
                <span>{formatCurrency(transaction.totalCost)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div style={{ fontSize: '10px', margin: '2px 0' }}>
              <p style={{ fontWeight: 'bold', margin: 0 }}>Payment Method:</p>
              <p style={{ margin: 0 }}>{transaction.paymentMethod === 'momo' ? 'Mobile Money' : 'Cash'}</p>
            </div>

            {/* Footer */}
            <div style={{ marginTop: '2px', textAlign: 'center', fontSize: '10px' }}>
              <p>Thank you for your business!</p>
              <p>Please keep this receipt for collection</p>
            </div>
          </div>
        </div>

        {/* Printer Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Printer:
          </label>
          {printers.length > 0 ? (
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a printer...</option>
              {printers.map((printer) => (
                <option key={printer.name} value={printer.name}>
                  {printer.displayName} {printer.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm text-gray-500 p-2 border border-gray-200 rounded">
              No printers found. You can still use browser print.
            </div>
          )}
        </div>

        {/* Error Message */}
        {printError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {printError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            disabled={isPrinting || (!selectedPrinter && printers.length > 0)}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isPrinting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Printing...
              </>
            ) : (
              '🖨️ Print Receipt'
            )}
          </button>
          
          <button
            onClick={handleFallbackPrint}
            className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
          >
            📄 Browser Print
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>

        {printers.length === 0 && (
          <div className="mt-3 text-xs text-gray-500 text-center">
            Tip: Electron printer integration provides better control for thermal printers
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintPreview;
