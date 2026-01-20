import React from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils/calculations';

interface ReceiptProps {
  transaction: Transaction;
  onNewOrder: () => void;
  onPrint: () => void;
}

export const Receipt: React.FC<ReceiptProps> = ({ 
  transaction, 
  onNewOrder,
  onPrint 
}) => {
  return (
    <>
      {/* Thermal Printer Specific Styles */}
      <style>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0mm !important;
            padding: 0mm !important;
          }
          
          * {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          html, body {
            margin: 0mm !important;
            padding: 0mm !important;
            width: 80mm !important;
            font-family: "Courier New", Courier, monospace !important;
            font-size: 13px !important;
            line-height: 1.2 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .max-w-2xl {
            max-width: 80mm !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          .print-receipt {
            width: 80mm !important;
            max-width: 80mm !important;
            min-width: 80mm !important;
            margin: 0mm !important;
            padding: 3mm !important;
            font-family: "Courier New", Courier, monospace !important;
            font-size: 13px !important;
            line-height: 1.2 !important;
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
          }
          
          .print-receipt * {
            font-family: "Courier New", Courier, monospace !important;
          }
          
          .print-receipt h1 {
            font-size: 16px !important;
            font-weight: bold !important;
            margin: 1mm 0 !important;
            padding: 1mm 0 !important;
          }
          
          .print-receipt p {
            margin: 1mm 0 !important;
            padding: 0.5mm 0 !important;
          }
          
          .print-receipt div {
            margin: 0.5mm 0 !important;
          }
          
          .print-receipt img {
            max-width: 35mm !important;
            max-height: 15mm !important;
            margin: 1mm auto !important;
          }
          
          .print-receipt table, .print-receipt [style*="display: grid"] {
            width: 100% !important;
            margin: 1mm 0 !important;
          }
          
          .print-receipt [style*="padding"] {
            padding: 1.5mm !important;
          }
          
          .print-receipt [style*="border"] {
            border-width: 1px !important;
            border-color: black !important;
          }
          
          .no-print {
            display: none !important;
          }
        }
        
        /* Screen display styles */
        .print-receipt {
          border: 2px dashed #ccc;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
      `}</style>
      
      <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex gap-4 no-print">
        <button
          onClick={onNewOrder}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          New Order
        </button>
        <button
          onClick={onPrint}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200"
        >
          <Printer className="w-4 h-4" />
          Print Receipt
        </button>
      </div>

      {/* Receipt Content - Fixed thermal printer size */}
      <div 
        id="receipt-content" 
        className="print-receipt bg-white"
        style={{
          width: '80mm',
          maxWidth: '80mm',
          minWidth: '80mm',
          fontFamily: '"Courier New", Courier, monospace',
          fontSize: '13px',
          lineHeight: '1.2',
          padding: '3mm',
          margin: '0 auto',
          boxSizing: 'border-box',
          overflowWrap: 'break-word',
          wordWrap: 'break-word',
          backgroundColor: 'white',
          color: 'black',
          border: '1px solid #ccc',
          fontWeight: '600',
          letterSpacing: '0.3px'
        }}
      >
        {/* Logo and Business Name - Centered */}
        <div className="w-full text-center" style={{ marginBottom: '2mm' }}>
          {/* Logo */}
          <div style={{ marginBottom: '1mm' }}>
            <img 
              src="./logo/Logo.jpg" 
              alt="Brother Diagnostic Center Logo" 
              style={{
                maxWidth: '40mm',
                maxHeight: '40mm',
                width: 'auto',
                height: 'auto',
                margin: '0 auto',
                display: 'block'
              }}
              onError={(e) => {
                // Hide logo if image fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          
          <div style={{ borderBottom: '1px solid black', marginBottom: '1mm', paddingBottom: '1mm' }}>
            <h1 style={{ 
              fontSize: '18px', 
              fontWeight: 'bold', 
              margin: '0',
              textAlign: 'center'
            }}>
              BROTHER DIAGNOSTIC CENTER
            </h1>
          </div>
          <p style={{ 
            fontSize: '10px', 
            margin: '0',
            textAlign: 'center',
            lineHeight: '1.1'
          }}>
            Loc: Opp. Goil Filling Station, Beposo.<br/>
            Shama Mun. Tel: +233 0208822856<br/>
            +233 0530440172
          </p>
        </div>

        {/* Receipt Info */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          marginBottom: '1mm', 
          fontSize: '10px',
          gap: '2mm'
        }}>
          <div style={{ textAlign: 'left' }}>
            <span>Receipt #: {transaction.referenceNumber}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span>Customer: {transaction.customer.name}</span>
          </div>
        </div>

        {/* Date and Label */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          marginBottom: '2mm', 
          fontSize: '10px',
          gap: '1mm'
        }}>
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
        <div style={{ 
          width: '100%', 
          border: '1px solid black',
          marginBottom: '2mm'
        }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '70% 30%',
            borderBottom: '1px solid black',
            backgroundColor: '#f0f0f0'
          }}>
            <div style={{ 
              padding: '1mm', 
              borderRight: '1px solid black', 
              fontWeight: 'bold', 
              fontSize: '12px',
              textAlign: 'left'
            }}>Test</div>
            <div style={{ 
              padding: '1mm', 
              textAlign: 'center', 
              fontWeight: 'bold', 
              fontSize: '12px'
            }}>Amount</div>
          </div>

          {/* Table Items */}
          {transaction.selectedTests.map(({ test, quantity }) => (
            <div
              key={test.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '70% 30%',
                borderBottom: '1px solid black',
              }}
            >
              <div style={{ 
                padding: '1mm', 
                borderRight: '1px solid black', 
                fontSize: '11px',
                wordBreak: 'break-word'
              }}>{test.name || 'Unknown Test'}</div>
              <div style={{ 
                padding: '1mm', 
                textAlign: 'center', 
                fontSize: '11px'
              }}>{formatCurrency((test.price || 0) * (quantity || 0))}</div>
            </div>
          ))}
        </div>

        {/* Total Section */}
        <div style={{ 
          borderTop: '2px solid black', 
          marginTop: '1mm', 
          paddingTop: '1mm', 
          display: 'flex', 
          justifyContent: 'flex-end', 
          width: '100%',
          marginBottom: '2mm'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '2mm', 
            padding: '1mm', 
            fontWeight: 'bold', 
            fontSize: '14px', 
            whiteSpace: 'nowrap',
            backgroundColor: '#f0f0f0',
            border: '1px solid black',
            borderRadius: '2px'
          }}>
            <span>TOTAL:</span>
            <span>{formatCurrency(transaction.totalCost)}</span>
          </div>
        </div>

        {/* Payment Method */}
        <div style={{ 
          fontSize: '10px', 
          margin: '2mm 0',
          textAlign: 'center'
        }}>
          <p style={{ fontWeight: 'bold', margin: '0 0 1mm 0' }}>Payment Method:</p>
          <p style={{ margin: '0' }}>{transaction.paymentMethod === 'momo' ? 'Mobile Money' : 'Cash'}</p>
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: '2mm', 
          textAlign: 'center', 
          fontSize: '10px',
          borderTop: '1px dashed black',
          paddingTop: '2mm'
        }}>
          <p style={{ margin: '0 0 1mm 0', fontWeight: 'bold' }}>Thank you for your business!</p>
          <p style={{ margin: '0' }}>Please keep this receipt for collection</p>
        </div>
      </div>
    </div>
    </>
  );
};