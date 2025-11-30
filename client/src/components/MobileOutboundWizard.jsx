// client/src/components/MobileOutboundWizard.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, ChevronRight, ChevronLeft, Check, Search, Package, MapPin, AlertTriangle, Zap } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';

const MobileOutboundWizard = ({ inventory, onAddToCart, onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    skuId: '',
    bin: '',
    quantity: ''
  });
  const [errors, setErrors] = useState({});
  const [availableProduct, setAvailableProduct] = useState(null);
  const [showSkuScanner, setShowSkuScanner] = useState(false);
  const [showBinScanner, setShowBinScanner] = useState(false);
  const [skuSearchTerm, setSkuSearchTerm] = useState('');
  const [binSearchTerm, setBinSearchTerm] = useState('');
  const [showSkuDropdown, setShowSkuDropdown] = useState(false);
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

  // Get unique SKU IDs from inventory
  const getUniqueSKUs = () => {
    const uniqueSkus = [...new Set(inventory.map(item => item.skuId))];
    return uniqueSkus.sort();
  };

  // Get bins for selected SKU
  const getBinsForSku = (skuId) => {
    return inventory.filter(item => item.skuId.toUpperCase() === skuId.toUpperCase());
  };

  // Filter SKUs based on search
  const getFilteredSKUs = () => {
    if (!skuSearchTerm) return getUniqueSKUs();
    return getUniqueSKUs().filter(sku => 
      sku.toLowerCase().includes(skuSearchTerm.toLowerCase())
    );
  };

  // Filter bins based on search
  const getFilteredBins = () => {
    if (!formData.skuId) return [];
    const binsForSku = getBinsForSku(formData.skuId);
    if (!binSearchTerm) return binsForSku;
    return binsForSku.filter(item => 
      item.bin.toLowerCase().includes(binSearchTerm.toLowerCase())
    );
  };

  const handleSkuScan = (scannedCode) => {
    const normalizedSku = scannedCode.trim().toUpperCase();
    const matchedProduct = inventory.find(item => item.skuId.toUpperCase() === normalizedSku);
    
    if (matchedProduct) {
      setFormData(prev => ({ ...prev, skuId: matchedProduct.skuId }));
      setSkuSearchTerm(matchedProduct.skuId);
      setShowSkuScanner(false);
      setErrors(prev => ({ ...prev, skuId: null }));
      // Auto-proceed to next step
      setTimeout(() => {
        if (validateStep(1)) {
          setStep(2);
        }
      }, 500);
    } else {
      setErrors(prev => ({ ...prev, skuId: `SKU "${normalizedSku}" not found in inventory` }));
      setShowSkuScanner(false);
      setSkuSearchTerm(normalizedSku);
    }
  };

  const handleBinScan = (scannedCode) => {
    const normalizedBin = scannedCode.trim().toUpperCase();
    const matchedProduct = inventory.find(
      item => item.skuId.toUpperCase() === formData.skuId.toUpperCase() && 
              item.bin.toUpperCase() === normalizedBin
    );
    
    if (matchedProduct) {
      setFormData(prev => ({ ...prev, bin: matchedProduct.bin }));
      setBinSearchTerm(matchedProduct.bin);
      setAvailableProduct(matchedProduct);
      setShowBinScanner(false);
      setErrors(prev => ({ ...prev, bin: null }));
      // Auto-proceed to next step
      setTimeout(() => {
        if (validateStep(2)) {
          setStep(3);
        }
      }, 500);
    } else {
      setErrors(prev => ({ 
        ...prev, 
        bin: `Bin "${normalizedBin}" not found for SKU ${formData.skuId}` 
      }));
      setShowBinScanner(false);
      setBinSearchTerm(normalizedBin);
    }
  };

  const validateStep = (currentStep) => {
    const newErrors = {};

    if (currentStep === 1) {
      if (!formData.skuId.trim()) {
        newErrors.skuId = 'SKU ID is required';
      } else {
        const skuExists = inventory.some(item => item.skuId.toUpperCase() === formData.skuId.toUpperCase());
        if (!skuExists) {
          newErrors.skuId = `SKU "${formData.skuId}" not found in inventory`;
        }
      }
    } else if (currentStep === 2) {
      if (!formData.bin.trim()) {
        newErrors.bin = 'Bin location is required';
      } else {
        const product = inventory.find(
          item => item.skuId.toUpperCase() === formData.skuId.toUpperCase() && 
                  item.bin.toUpperCase() === formData.bin.toUpperCase()
        );
        if (!product) {
          newErrors.bin = `Product not available in bin "${formData.bin}"`;
        } else {
          setAvailableProduct(product);
        }
      }
    } else if (currentStep === 3) {
      if (!formData.quantity || formData.quantity <= 0) {
        newErrors.quantity = 'Quantity must be greater than 0';
      } else if (availableProduct && formData.quantity > availableProduct.quantity) {
        newErrors.quantity = `Only ${availableProduct.quantity} units available`;
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
    if (validateStep(3) && availableProduct) {
      onAddToCart(availableProduct, Number(formData.quantity));
      // Reset for next entry
      setFormData({ skuId: '', bin: '', quantity: '' });
      setSkuSearchTerm('');
      setBinSearchTerm('');
      setAvailableProduct(null);
      setStep(1);
    }
  };

  const handleSkuSelect = (sku) => {
    setFormData(prev => ({ ...prev, skuId: sku, bin: '' }));
    setSkuSearchTerm(sku);
    setShowSkuDropdown(false);
    setBinSearchTerm('');
    setAvailableProduct(null);
    setErrors(prev => ({ ...prev, skuId: null }));
  };

  const handleBinSelect = (product) => {
    setFormData(prev => ({ ...prev, bin: product.bin }));
    setBinSearchTerm(product.bin);
    setAvailableProduct(product);
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
        <h3 className="text-xl font-bold text-gray-900">Step 1: Select Product</h3>
        <p className="text-sm text-gray-600 mt-2">Type, search, or scan the SKU</p>
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
          <span className="px-3 bg-white text-gray-500">or search manually</span>
        </div>
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          SKU ID <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            ref={skuInputRef}
            type="text"
            value={skuSearchTerm}
            onChange={(e) => {
              setSkuSearchTerm(e.target.value);
              setShowSkuDropdown(true);
              setErrors(prev => ({ ...prev, skuId: null }));
              // Update formData only if exact match
              const exactMatch = inventory.find(item => item.skuId.toLowerCase() === e.target.value.toLowerCase());
              if (exactMatch) {
                setFormData(prev => ({ ...prev, skuId: exactMatch.skuId }));
              } else {
                setFormData(prev => ({ ...prev, skuId: '' }));
              }
            }}
            onFocus={() => setShowSkuDropdown(true)}
            placeholder="Search for SKU..."
            className={`w-full pl-10 pr-4 py-4 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.skuId ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>

        {showSkuDropdown && getFilteredSKUs().length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {getFilteredSKUs().map(sku => (
              <div
                key={sku}
                onClick={() => handleSkuSelect(sku)}
                className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
              >
                <span className="font-medium font-mono">{sku}</span>
                {formData.skuId === sku && (
                  <Check className="w-5 h-5 text-blue-600" />
                )}
              </div>
            ))}
          </div>
        )}

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
            Selected SKU: <strong>{formData.skuId}</strong>
          </p>
          <p className="text-xs text-green-700 mt-1">
            Available in {getBinsForSku(formData.skuId).length} bin(s)
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
        <p className="text-sm text-gray-600 mt-2">Choose bin location for {formData.skuId}</p>
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

      <div className="relative">
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
              // Update formData only if exact match
              const exactMatch = inventory.find(
                item => item.skuId.toUpperCase() === formData.skuId.toUpperCase() && 
                        item.bin.toLowerCase() === e.target.value.toLowerCase()
              );
              if (exactMatch) {
                setFormData(prev => ({ ...prev, bin: exactMatch.bin }));
                setAvailableProduct(exactMatch);
              } else {
                setFormData(prev => ({ ...prev, bin: '' }));
                setAvailableProduct(null);
              }
            }}
            onFocus={() => setShowBinDropdown(true)}
            placeholder="Search bin location..."
            className={`w-full pl-10 pr-4 py-4 text-lg border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.bin ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        </div>

        {showBinDropdown && getFilteredBins().length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {getFilteredBins().map(product => (
              <div
                key={product._id}
                onClick={() => handleBinSelect(product)}
                className="px-4 py-3 hover:bg-blue-50 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium font-mono">{product.bin}</span>
                    <p className="text-xs text-gray-600 mt-1">
                      Available: {product.quantity} units
                    </p>
                  </div>
                  {formData.bin === product.bin && (
                    <Check className="w-5 h-5 text-blue-600" />
                  )}
                </div>
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

      {availableProduct && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-800">
            <Check className="w-4 h-4 inline mr-1" />
            Selected Bin: <strong>{formData.bin}</strong>
          </p>
          <p className="text-xs text-green-700 mt-1">
            Available Stock: <strong>{availableProduct.quantity} units</strong>
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
        <p className="text-sm text-gray-600 mt-2">How many units to pick?</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quantity <span className="text-red-500">*</span>
        </label>
        <input
          ref={quantityInputRef}
          type="number"
          min="1"
          max={availableProduct?.quantity || 999999}
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
        {availableProduct && (
          <p className="mt-2 text-sm text-gray-600">
            Maximum available: <strong>{availableProduct.quantity} units</strong>
          </p>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <h4 className="font-medium text-blue-900">Summary:</h4>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>SKU:</strong> {formData.skuId}</p>
          <p><strong>Bin:</strong> {formData.bin}</p>
          <p><strong>Quantity:</strong> {formData.quantity || '—'}</p>
          {availableProduct && (
            <p className="text-xs text-blue-700 mt-2">
              Stock after pick: {availableProduct.quantity - (Number(formData.quantity) || 0)} units
            </p>
          )}
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
        <p className="text-sm text-gray-600 mt-2">Review and confirm your outbound item</p>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600 uppercase">SKU ID</p>
            <p className="text-lg font-bold text-gray-900">{formData.skuId}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 uppercase">Quantity</p>
            <p className="text-lg font-bold text-red-600">-{formData.quantity}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-600 uppercase">Bin Location</p>
          <p className="text-lg font-bold text-blue-600">{formData.bin}</p>
        </div>
        {availableProduct && (
          <div className="pt-3 border-t border-blue-200">
            <p className="text-xs text-gray-600">Remaining Stock</p>
            <p className="text-sm font-medium text-gray-900">
              {availableProduct.quantity - Number(formData.quantity)} units
            </p>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-lg transition-colors flex items-center justify-center"
      >
        <Zap className="w-6 h-6 mr-2" />
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
              <h2 className="text-2xl font-bold text-gray-900">Pick Item</h2>
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

export default MobileOutboundWizard;
