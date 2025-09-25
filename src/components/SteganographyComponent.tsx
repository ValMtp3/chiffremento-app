import React, { useState, useCallback } from "react";
import { Upload, Download, Eye, EyeOff, Image } from "lucide-react";
import { CryptoUtils } from "../utils/crypto";

interface SteganographyComponentProps {}

export const SteganographyComponent: React.FC<
  SteganographyComponentProps
> = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedData, setSelectedData] = useState<File | null>(null);
  const [hiddenData, setHiddenData] = useState<ArrayBuffer | null>(null);
  const [steganographicImage, setSteganographicImage] =
    useState<ArrayBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<"hide" | "extract">("hide");
  const [error, setError] = useState<string>("");

  const handleImageSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (!file.type.startsWith("image/")) {
          setError("Veuillez sélectionner un fichier image valide");
          return;
        }
        setSelectedImage(file);
        setError("");
      }
    },
    [],
  );

  const handleDataSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setSelectedData(file);
        setError("");
      }
    },
    [],
  );

  const handleHideData = async () => {
    if (!selectedImage || !selectedData) {
      setError("Veuillez sélectionner une image et des données à cacher");
      return;
    }

    try {
      setIsProcessing(true);
      setError("");

      const dataToHide = await selectedData.arrayBuffer();

      const resultBlob = await CryptoUtils.hideDataInImage(
        selectedImage,
        dataToHide,
      );

      const resultBuffer = await resultBlob.arrayBuffer();
      setSteganographicImage(resultBuffer);
    } catch (err) {
      setError(`Erreur lors du masquage: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractData = async () => {
    if (!selectedImage) {
      setError("Veuillez sélectionner une image contenant des données cachées");
      return;
    }

    try {
      setIsProcessing(true);
      setError("");

      const extractedData =
        await CryptoUtils.extractDataFromImage(selectedImage);
      setHiddenData(extractedData);
    } catch (err) {
      setError(`Erreur lors de l'extraction: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSteganographicImage = () => {
    if (!steganographicImage || !selectedImage) return;

    const blob = new Blob([steganographicImage], { type: selectedImage.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `steganographic_${selectedImage.name}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExtractedData = () => {
    if (!hiddenData) return;

    const blob = new Blob([hiddenData]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extracted_data.bin";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <Image className="w-6 h-6 text-purple-500" />
        <h3 className="text-xl font-semibold text-white">Stéganographie</h3>
      </div>

      {/* Mode Selection */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => setMode("hide")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200
              ${
                mode === "hide"
                  ? "bg-purple-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              }
            `}
          >
            <EyeOff className="w-4 h-4" />
            Cacher des données
          </button>
          <button
            onClick={() => setMode("extract")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200
              ${
                mode === "extract"
                  ? "bg-purple-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              }
            `}
          >
            <Eye className="w-4 h-4" />
            Extraire des données
          </button>
        </div>
      </div>

      {/* Hide Mode */}
      {mode === "hide" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Image de couverture
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
            />
            {selectedImage && (
              <p className="text-sm text-gray-400 mt-1">
                Sélectionné: {selectedImage.name} (
                {(selectedImage.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Données à cacher
            </label>
            <input
              type="file"
              onChange={handleDataSelect}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
            />
            {selectedData && (
              <p className="text-sm text-gray-400 mt-1">
                Sélectionné: {selectedData.name} (
                {(selectedData.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <button
            onClick={handleHideData}
            disabled={!selectedImage || !selectedData || isProcessing}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <EyeOff className="w-5 h-5" />
            {isProcessing ? "Masquage en cours..." : "Cacher les données"}
          </button>

          {steganographicImage && (
            <button
              onClick={downloadSteganographicImage}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger l'image avec données cachées
            </button>
          )}
        </div>
      )}

      {/* Extract Mode */}
      {mode === "extract" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Image contenant des données cachées
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
            />
            {selectedImage && (
              <p className="text-sm text-gray-400 mt-1">
                Sélectionné: {selectedImage.name} (
                {(selectedImage.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <button
            onClick={handleExtractData}
            disabled={!selectedImage || isProcessing}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-5 h-5" />
            {isProcessing ? "Extraction en cours..." : "Extraire les données"}
          </button>

          {hiddenData && (
            <div className="space-y-2">
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-300">
                  Données extraites: {(hiddenData.byteLength / 1024).toFixed(1)}{" "}
                  KB
                </p>
              </div>
              <button
                onClick={downloadExtractedData}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Télécharger les données extraites
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 bg-red-900/50 border border-red-600 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 bg-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          ℹ️ Information
        </h4>
        <p className="text-xs text-gray-400">
          La stéganographie permet de cacher des données dans une image en
          modifiant imperceptiblement les pixels. La capacité de stockage dépend
          de la taille de l'image (environ 1 bit par pixel).
        </p>
      </div>
    </div>
  );
};
