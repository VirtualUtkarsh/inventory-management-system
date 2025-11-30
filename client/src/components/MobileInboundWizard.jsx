// client/src/components/MobileInboundWizard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, ChevronRight, ChevronLeft, Check, Search, Package, MapPin, AlertTriangle } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';

const MobileInboundWizard = ({ bins, onAddToCart, onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    skuId: '',
    bin: '',
    quantity: ''
  });
  const [errors, setErrors] = useState({});
  const [showSkuScanner, setShowSkuScanner] = useState(false);
  const [showBinScanner, setShowBinScanner] = useState(false);
  const [binSearchTerm, setBinSearchTerm] = useState('');
  const [showBinDropdown, setShowBinDropdown] = useState(false);

  const skuInputRef = useRef(null);
  const binInputRef = useRef(null);
  const quantityInputRef = useRef(null);

  // Auto-focus inputs when entering each step
  useEffect(() => {
    if (step === 1 && skuInputRef.current) {
      setTimeout(() => skuInputRef.current.focus(), 100);
    } else if (step === 2 && binInputRef.current) {
      setTimeout(() => binInputRef.current.focus(), 100);
    } else if (step === 3 && quantityInputRef.current) {
      setTimeout(() => quantityInputRef.current.focus(), 100);
    }
  }, [step]);

  const handleSkuScan = (scannedCode) => {
    const normalizedSku = scannedCode.trim().toUpperCase();
    setFormData(prev => ({ ...prev, skuId: normalizedSku }));
    setShowSkuScanner(false);
    setErrors(prev => ({ ...prev, skuId: null }));
    // Auto-proceed to next step after successful SKU scan
    setTimeout(() => {
      if (normalizedSku) {
        setStep(2);
      }
    }, 500);
  };

  const handleBinScan = (scannedCode) => {
    const normalizedBin = scannedCode.trim().toUpperCase();
    const matchedBin = bins.find(b => b.name.toUpperCase() === normalizedBin);
    
    if (matchedBin) {
      setFormData(prev => ({ ...prev, bin: matchedBin.name }));
      setBinSearchTerm(matchedBin.name);
      setShowBinScanner(false);
      setErrors(prev => ({ ...prev, bin: null }));
      // Auto-proceed to next step after successful bin scan
      setTimeout(() => {
        if (validateStep(2)) {
          setStep(3);
        }
      }, 500);
    } else {
      setErrors(prev => ({ ...prev, bin: `Bin "${normalizedBin}" not found in system` }));
      setShowBinScanner(false);
      // Keep the scanned value in search box so user can see what was scanned
      setBinSearchTerm(normalizedBin);
    }
  };

  const validateStep = (currentStep) => {
    const newErrors = {};

    if (currentStep === 1) {
      if (!formData.skuId.trim()) {
        newErrors.skuId = 'SKU ID is required';
      }
    } else if (currentStep === 2) {
      if (!formData.bin.trim()) {
        newErrors.bin = 'Bin location is required';
      } else {
        const binExists = bins.some(b => b.name.toUpperCase() === formData.bin.toUpperCase());
        if (!binExists) {
          newErrors.bin = `Bin "${formData.bin}" does not exist`;
        }
      }
    } else if (currentStep === 3) {
      if (!formData.quantity || formData.quantity <= 0) {
        newErrors.quantity = 'Quantity must be greater than 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleSubmit = () => {
    if (validateStep(3)) {
      onAddToCart({
        skuId: formData.skuId.trim().toUpperCase(),
        bin: formData.bin.trim().toUpperCase(),
        quantity: Number(formData.quantity)
      });

      // Reset for next entry
      setFormData({ skuId: '', bin: '', quantity: '' });
      setBinSearchTerm('');
      setStep(1);
    }
  };

  const getFilteredBins = () => {
    if (!binSearchTerm) return bins;
    return bins.filter(bin => 
      bin.name.toLowerCase().includes(binSearchTerm.toLowerCase())
    );
  };

  const handleBinSelect = (binName) => {
    setFormData(prev => ({ ...prev, bin: binName }));
    setBinSearchTerm(binName);
    setShowBinDropdown(false);
    setErrors(prev => ({ ...prev, bin: null }));
  };

  const renderProgressBar = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        {[1, 2, 3, 4].map((stepNum) => (
          <div key={stepNum} className="flex items-center flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              step > stepNum ? 'bg-green-500 text-white' : 
              step === stepNum ? 'bg-blue-600 text-white' : 
              'bg-gray-300 text-gray-600'
            }`}>
              {step > stepNum ? <Check className="w-5 h-5" /> : stepNum}
            </div>
            {stepNum < 4 && (
              <div className={`flex-1 h-1 mx-2 ${
                step > stepNum ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-600 mt-2 px-2">
        <span>SKU</span>
        <span>Bin</span>
        <span>Qty</span>
        <span>Add</span>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Package className="w-16 h-16 text-blue-600 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-gray-900">Step 1: Enter SKU ID</h3>
        <p className="text-sm text-gray-600 mt-2">Type or scan the product SKU</p>
      </div>

      <button
        onClick={() => setShowSkuScanner(true)}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center shadow-sm"
      >
        <Camera className="w-5 h-5 mr-2" />
        Scan SKU Barcode
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white text-gray-500">or type manually</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SKU ID <span className="text-red-500">*</span>
        </label>
        <input
          ref={skuInputRef}
          type="text"
          value={formData.skuId}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, skuId: e.target.value }));
            setErrors(prev => ({ ...prev, skuId: null }));
          }}
          placeholder="e.g. TS1156-L-RED-PACK10"
          className={`w-full px-4 py-4 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.skuId ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.skuId && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1" />
            {errors.skuId}
          </p>
        )}
      </div>

      {formData.skuId && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <Check className="w-4 h-4 inline mr-1" />
            SKU: <strong>{formData.skuId}</strong>
          </p>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <MapPin className="w-16 h-16 text-blue-600 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-gray-900">Step 2: Select Bin</h3>
        <p className="text-sm text-gray-600 mt-2">Type, search, or scan the bin location</p>
      </div>

      <button
        onClick={() => setShowBinScanner(true)}
        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center shadow-sm"
      >
        <Camera className="w-5 h-5 mr-2" />
        Scan Bin Barcode
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white text-gray-500">or search manually</span>
        </div>
      </div>

      <div className="relative bin-dropdown-container">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Bin Location <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            ref={binInputRef}
            type="text"
            value={binSearchTerm}
            onChange={(e) => {
              setBinSearchTerm(e.target.value);
              setShowBinDropdown(true);
              setErrors(prev => ({ ...prev, bin: null }));
              // Also update formData.bin if exact match
              const exactMatch = bins.find(b => b.name.toLowerCase() === e.target.value.toLowerCase());
              if (exactMatch) {
                setFormData(prev => ({ ...prev, bin: exactMatch.name }));
              } else {
                setFormData(prev => ({ ...prev, bin: '' }));
              }
            }}
            onFocus={() => setShowBinDropdown(true)}
            placeholder="Search bin..."
            className={`w-full pl-10 pr-4 py-4 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.bin ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>

        {showBinDropdown && getFilteredBins().length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {getFilteredBins().map(bin => (
              <div
                key={bin._id}
                onClick={() => handleBinSelect(bin.name)}
                className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
              >
                <span className="font-medium">{bin.name}</span>
                {formData.bin === bin.name && (
                  <Check className="w-5 h-5 text-blue-600" />
                )}
              </div>
            ))}
          </div>
        )}

        {errors.bin && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1" />
            {errors.bin}
          </p>
        )}
      </div>

      {formData.bin && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <Check className="w-4 h-4 inline mr-1" />
            Bin: <strong>{formData.bin}</strong>
          </p>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <Package className="w-16 h-16 text-blue-600 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-gray-900">Step 3: Enter Quantity</h3>
        <p className="text-sm text-gray-600 mt-2">How many units are you adding?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quantity <span className="text-red-500">*</span>
        </label>
        <input
          ref={quantityInputRef}
          type="number"
          min="1"
          value={formData.quantity}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, quantity: e.target.value }));
            setErrors(prev => ({ ...prev, quantity: null }));
          }}
          placeholder="Enter quantity"
          className={`w-full px-4 py-4 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.quantity ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {errors.quantity && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-1" />
            {errors.quantity}
          </p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <h4 className="font-medium text-blue-900">Summary:</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>SKU:</strong> {formData.skuId}</p>
          <p><strong>Bin:</strong> {formData.bin}</p>
          <p><strong>Quantity:</strong> {formData.quantity || '—'}</p>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Ready to Add!</h3>
        <p className="text-sm text-gray-600 mt-2">Review and confirm your entry</p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600 uppercase">SKU ID</p>
            <p className="text-lg font-bold text-gray-900">{formData.skuId}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase">Quantity</p>
            <p className="text-lg font-bold text-green-600">+{formData.quantity}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-600 uppercase">Bin Location</p>
          <p className="text-lg font-bold text-blue-600">{formData.bin}</p>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-lg transition-colors flex items-center justify-center"
      >
        <Check className="w-6 h-6 mr-2" />
        Add to Cart
      </button>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white w-full sm:max-w-md sm:rounded-xl rounded-t-3xl max-h-[95vh] flex flex-col animate-slide-up">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Add Inbound Item</h2>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            {renderProgressBar()}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
          </div>

          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-3">
              {step > 1 && step < 4 && (
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  Back
                </button>
              )}
              {step < 4 && (
                <button
                  onClick={handleNext}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
                >
                  Next
                  <ChevronRight className="w-5 h-5 ml-1" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSkuScanner && (
        <BarcodeScanner
          onScan={handleSkuScan}
          onClose={() => setShowSkuScanner(false)}
          title="Scan SKU Barcode"
        />
      )}

      {showBinScanner && (
        <BarcodeScanner
          onScan={handleBinScan}
          onClose={() => setShowBinScanner(false)}
          title="Scan Bin Barcode"
        />
      )}

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default MobileInboundWizard;
