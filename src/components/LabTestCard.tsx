import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { LabTest, SelectedTest } from '../types';
import { formatCurrency } from '../utils/calculations';

interface LabTestCardProps {
  test: LabTest;
  selectedTest?: SelectedTest;
  onAdd: (test: LabTest) => void;
  onRemove: (testId: string) => void;
  onQuantityChange: (testId: string, quantity: number) => void;
}

export const LabTestCard: React.FC<LabTestCardProps> = ({
  test,
  selectedTest,
  onAdd,
  onRemove,
  onQuantityChange
}) => {
  const isSelected = !!selectedTest;
  const quantity = selectedTest?.quantity || 0;

  return (
    <div className={`bg-white rounded-lg shadow-md border-2 transition-all duration-200 ${
      isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-blue-300'
    }`}>
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900">{test.name}</h3>
          <span className="text-xl font-bold text-blue-600">
            {formatCurrency(test.price)}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mb-2">{test.description}</p>
        <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full mb-4">
          {test.category}
        </span>
        
        {!isSelected ? (
          <button
            onClick={() => onAdd(test)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Test
          </button>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => quantity > 1 ? onQuantityChange(test.id, quantity - 1) : onRemove(test.id)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
              >
                <Minus className="w-4 h-4" />
              </button>
              
              <span className="text-lg font-medium text-gray-900 min-w-[2rem] text-center">
                {quantity}
              </span>
              
              <button
                onClick={() => onQuantityChange(test.id, quantity + 1)}
                className="bg-blue-600 hover:bg-blue-700 text-white w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-600">Subtotal</p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(test.price * quantity)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};