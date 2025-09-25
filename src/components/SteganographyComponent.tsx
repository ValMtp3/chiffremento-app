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
  const [password, setPassword] = useState<string>("");
  const [useEncryption, setUseEncryption] = useState<boolean>(true);
  const [imageCapacity, setImageCapacity] = useState<number>(0);
  const [dataSize, setDataSize] = useState<number>(0);

  const handleImageSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (!file.type.startsWith("image/")) {
          setError(
            "Veuillez sélectionner un fichier image valide (PNG, JPEG, BMP)",
          );
          return;
        }

        // Vérifier la taille minimale
        if (file.size < 10 * 1024) {
          setError("Image trop petite (minimum 10KB requis)");
          return;
        }

        // Calculer la capacité de stockage
        try {
          const capacity = await calculateImageCapacity(file);
          setImageCapacity(capacity);

          if (selectedData && selectedData.size > capacity * 0.8) {
            setError(
              "Les données à cacher sont trop volumineuses pour cette image",
            );
          } else {
            setError("");
          }
        } catch (err) {
          setError("Erreur lors de l'analyse de l'image");
        }

        setSelectedImage(file);
      }
    },
    [selectedData],
  );

  const handleDataSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        // Vérifier la taille du fichier
        if (file.size === 0) {
          setError("Le fichier ne peut pas être vide");
          return;
        }

        if (file.size > 50 * 1024 * 1024) {
          setError("Fichier trop volumineux (limite: 50MB)");
          return;
        }

        setDataSize(file.size);

        // Vérifier si l'image sélectionnée peut contenir ces données
        if (
          selectedImage &&
          imageCapacity > 0 &&
          file.size > imageCapacity * 0.8
        ) {
          setError("Données trop volumineuses pour l'image sélectionnée");
          return;
        }

        setSelectedData(file);
        setError("");
      }
    },
    [selectedImage, imageCapacity],
  );

  const handleHideData = async () => {
    if (!selectedImage || !selectedData) {
      setError("Veuillez sélectionner une image et des données à cacher");
      return;
    }

    if (useEncryption && !password.trim()) {
      setError("Mot de passe requis pour le chiffrement");
      return;
    }

    try {
      setIsProcessing(true);
      setError("");

      // Validation finale des tailles
      if (selectedData.size > imageCapacity * 0.8) {
        throw new Error("Données trop volumineuses pour cette image");
      }

      const dataToHide = await selectedData.arrayBuffer();

      const resultBlob = await CryptoUtils.hideDataInImage(
        selectedImage,
        dataToHide,
        useEncryption ? password.trim() : undefined,
      );

      const resultBuffer = await resultBlob.arrayBuffer();
      setSteganographicImage(resultBuffer);

      // Nettoyer le mot de passe de la mémoire si utilisé
      if (useEncryption) {
        setPassword("");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(`Erreur lors du masquage: ${errorMessage}`);
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

      const extractedData = await CryptoUtils.extractDataFromImage(
        selectedImage,
        password.trim() || undefined,
      );

      setHiddenData(extractedData);

      // Nettoyer le mot de passe
      setPassword("");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      if (
        errorMessage.includes("Mot de passe requis") ||
        errorMessage.includes("Erreur de déchiffrement")
      ) {
        setError("Mot de passe incorrect ou données non chiffrées");
      } else {
        setError(`Erreur lors de l'extraction: ${errorMessage}`);
      }
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
    a.download = `extracted_data_${Date.now()}.bin`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculer la capacité de stockage d'une image
  const calculateImageCapacity = async (imageFile: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Capacité théorique: 2 bits par pixel (R et G channels) / 8 bits par byte
        const capacity = Math.floor((img.width * img.height * 2) / 8);
        resolve(capacity);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(imageFile);
    });
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
              <div className="text-sm text-gray-400 mt-2 space-y-1">
                <p>
                  Sélectionné: {selectedImage.name} (
                  {(selectedImage.size / 1024).toFixed(1)} KB)
                </p>
                {imageCapacity > 0 && (
                  <p>
                    Capacité de stockage: {(imageCapacity / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
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
              <div className="text-sm text-gray-400 mt-2 space-y-1">
                <p>
                  Sélectionné: {selectedData.name} (
                  {(selectedData.size / 1024).toFixed(1)} KB)
                </p>
                {imageCapacity > 0 && (
                  <p
                    className={`${selectedData.size > imageCapacity * 0.8 ? "text-red-400" : "text-green-400"}`}
                  >
                    Utilisation:{" "}
                    {((selectedData.size / imageCapacity) * 100).toFixed(1)}% de
                    la capacité
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-3">
              <input
                type="checkbox"
                checked={useEncryption}
                onChange={(e) => setUseEncryption(e.target.checked)}
                className="rounded accent-purple-600"
              />
              Chiffrer les données avant dissimulation (recommandé)
            </label>

            {useEncryption && (
              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mot de passe de chiffrement
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  placeholder="Entrez un mot de passe fort..."
                />
              </div>
            )}
          </div>

          <button
            onClick={handleHideData}
            disabled={
              !selectedImage ||
              !selectedData ||
              isProcessing ||
              (useEncryption && !password.trim())
            }
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <EyeOff className="w-5 h-5" />
            {isProcessing ? "Masquage et chiffrement..." : "Cacher les données"}
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

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mot de passe (si les données sont chiffrées)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              placeholder="Laissez vide si non chiffré..."
            />
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
        <h4 className="text-sm font-medium text-gray-300 mb-3">
          🔒 Sécurité Avancée
        </h4>
        <div className="space-y-2 text-xs text-gray-400">
          <p>
            • <strong>Chiffrement AES-256-GCM</strong> des données avant
            dissimulation
          </p>
          <p>
            • <strong>Signature cryptographique</strong> pour détecter la
            présence de données
          </p>
          <p>
            • <strong>Modification LSB sécurisée</strong> sur les canaux R et G
            seulement
          </p>
          <p>
            • <strong>Validation d'intégrité</strong> automatique lors de
            l'extraction
          </p>
          <p>
            • Capacité: environ <strong>2 bits par pixel</strong> (plus sécurisé
            que 3 bits)
          </p>
          <p>
            • <strong>Formats supportés:</strong> PNG (recommandé), JPEG, BMP
          </p>
        </div>
      </div>
    </div>
  );
};
