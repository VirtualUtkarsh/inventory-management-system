// client/src/components/BarcodeScanner.jsx
import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, AlertTriangle, Zap } from 'lucide-react';

const BarcodeScanner = ({ onScan, onClose, title = "Scan Barcode" }) => {
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const initScanner = async () => {
      try {
        // Check if we're on mobile
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (!isMobile) {
          setError('Camera scanning works best on mobile devices. Please use manual entry on desktop.');
          setManualEntry(true);
          return;
        }

        // Request camera permission
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Use back camera
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        setIsScanning(true);

        // Import and initialize QuaggaJS dynamically
        const Quagga = (await import('quagga')).default;
        
        if (!mounted) return;

        Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: videoRef.current,
            constraints: {
              facingMode: "environment"
            }
          },
          decoder: {
            readers: [
              "code_128_reader",
              "ean_reader",
              "ean_8_reader",
              "code_39_reader",
              "code_39_vin_reader",
              "codabar_reader",
              "upc_reader",
              "upc_e_reader",
              "i2of5_reader"
            ],
            config: {
                code_128_reader: {
            checkOrder: true, 
            minLength: 10 
        }
            }
          },
          locate: true,
          locator: {
            patchSize: "medium",
            halfSample: true
          },
          numOfWorkers: 2,
          frequency: 10
        }, (err) => {
          if (err) {
            console.error('QuaggaJS init error:', err);
            setError('Failed to initialize barcode scanner');
            setManualEntry(true);
            return;
          }
          
          if (mounted) {
            Quagga.start();
            scannerRef.current = Quagga;
          }
        });

        Quagga.onDetected((result) => {
          if (result && result.codeResult && result.codeResult.code) {
            const code = result.codeResult.code;
            onScan(code);
            cleanup();
          }
        });

      } catch (err) {
        console.error('Camera access error:', err);
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please enable camera access or use manual entry.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please use manual entry.');
        } else {
          setError('Camera not available. Please use manual entry.');
        }
        setManualEntry(true);
      }
    };

    initScanner();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [onScan]);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (scannerRef.current) {
      try {
        scannerRef.current.stop();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Scanner View */}
      <div className="flex-1 relative">
        {!manualEntry && (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {/* Scanning overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Scanning frame */}
                <div className="w-64 h-64 border-4 border-blue-500 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                  
                  {/* Scanning line animation */}
                  {isScanning && (
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="w-full h-1 bg-blue-500 shadow-lg shadow-blue-500/50 animate-scan"></div>
                    </div>
                  )}
                </div>
                
                <p className="text-white text-center mt-6 text-lg font-medium drop-shadow-lg">
                  {isScanning ? 'Scanning...' : 'Initializing camera...'}
                </p>
              </div>
            </div>
          </>
        )}

        {/* Error / Manual Entry */}
        {(error || manualEntry) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 p-6">
            <div className="max-w-md w-full">
              {error && (
                <div className="mb-6 p-4 bg-yellow-900/50 border border-yellow-600 rounded-lg flex items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-200 text-sm">{error}</p>
                </div>
              )}

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-blue-600 rounded-full">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                
                <h4 className="text-xl font-bold text-white text-center mb-2">
                  Manual Entry
                </h4>
                <p className="text-gray-400 text-center text-sm mb-6">
                  Enter the barcode manually
                </p>

                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Enter barcode number..."
                    autoFocus
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  
                  <button
                    type="submit"
                    disabled={!manualCode.trim()}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Submit Code
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Instructions */}
      {!manualEntry && (
        <div className="bg-gray-900 text-white p-4 text-center">
          <p className="text-sm text-gray-400">
            Position the barcode within the frame
          </p>
          <button
            onClick={() => setManualEntry(true)}
            className="mt-3 text-blue-400 hover:text-blue-300 underline text-sm"
          >
            Switch to Manual Entry
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes scan {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(256px);
          }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;
