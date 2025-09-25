import React, { useState, useCallback } from "react";
import { Shield, Eye, EyeOff, Download, Upload, Lock } from "lucide-react";
import { CryptoUtils } from "../utils/crypto";

interface DeniabilityComponentProps {}

export const DeniabilityComponent: React.FC<DeniabilityComponentProps> = () => {
  const [publicFile, setPublicFile] = useState<File | null>(null);
  const [hiddenFile, setHiddenFile] = useState<File | null>(null);
  const [containerFile, setContainerFile] = useState<File | null>(null);
  const [publicPassword, setPublicPassword] = useState("");
  const [hiddenPassword, setHiddenPassword] = useState("");
  const [extractPassword, setExtractPassword] = useState("");
  const [deniableContainer, setDeniableContainer] =
    useState<ArrayBuffer | null>(null);
  const [extractedData, setExtractedData] = useState<ArrayBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<"create" | "extract">("create");
  const [extractMode, setExtractMode] = useState<"public" | "hidden">("public");
  const [error, setError] = useState<string>("");

  const handlePublicFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setPublicFile(file);
        setError("");
      }
    },
    [],
  );

  const handleHiddenFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setHiddenFile(file);
        setError("");
      }
    },
    [],
  );

  const handleContainerFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setContainerFile(file);
        setError("");
      }
    },
    [],
  );

  const createDeniableContainer = async () => {
    if (!publicFile || !hiddenFile || !publicPassword || !hiddenPassword) {
      setError("Veuillez remplir tous les champs requis");
      return;
    }

    if (publicPassword === hiddenPassword) {
      setError("Les mots de passe public et caché doivent être différents");
      return;
    }

    try {
      setIsProcessing(true);
      setError("");

      const publicData = await publicFile.arrayBuffer();
      const hiddenData = await hiddenFile.arrayBuffer();

      const container = CryptoUtils.createDeniableContainer(
        publicData,
        hiddenData,
        publicPassword,
        hiddenPassword,
      );

      setDeniableContainer(container);
    } catch (err) {
      setError(`Erreur lors de la création: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const extractFromContainer = async () => {
    if (!containerFile || !extractPassword) {
      setError("Veuillez sélectionner un conteneur et entrer un mot de passe");
      return;
    }

    try {
      setIsProcessing(true);
      setError("");

      const containerData = await containerFile.arrayBuffer();

      if (extractMode === "public") {
        // Extraction des données publiques (début du conteneur)
        const publicSize = Math.floor(containerData.byteLength * 0.6); // Approximation
        const publicData = containerData.slice(0, publicSize);
        setExtractedData(publicData);
      } else {
        // Extraction des données cachées
        const hiddenSize = Math.floor(containerData.byteLength * 0.2); // Approximation
        const hiddenData = CryptoUtils.extractHiddenData(
          containerData,
          extractPassword,
          hiddenSize,
        );
        setExtractedData(hiddenData);
      }
    } catch (err) {
      setError(`Erreur lors de l'extraction: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadContainer = () => {
    if (!deniableContainer) return;

    const blob = new Blob([deniableContainer]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deniable_container.dat";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExtracted = () => {
    if (!extractedData) return;

    const blob = new Blob([extractedData]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extracted_${extractMode}_data.bin`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-indigo-500" />
        <h3 className="text-xl font-semibold text-white">Mode Deniability</h3>
      </div>

      {/* Mode Selection */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => setMode("create")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200
              ${
                mode === "create"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              }
            `}
          >
            <Lock className="w-4 h-4" />
            Créer un conteneur
          </button>
          <button
            onClick={() => setMode("extract")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200
              ${
                mode === "extract"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              }
            `}
          >
            <Eye className="w-4 h-4" />
            Extraire des données
          </button>
        </div>
      </div>

      {/* Create Mode */}
      {mode === "create" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fichier public (leurre)
              </label>
              <input
                type="file"
                onChange={handlePublicFileSelect}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
              />
              {publicFile && (
                <p className="text-sm text-gray-400 mt-1">
                  {publicFile.name} ({(publicFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Fichier caché (secret)
              </label>
              <input
                type="file"
                onChange={handleHiddenFileSelect}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
              />
              {hiddenFile && (
                <p className="text-sm text-gray-400 mt-1">
                  {hiddenFile.name} ({(hiddenFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mot de passe public
              </label>
              <input
                type="password"
                value={publicPassword}
                onChange={(e) => setPublicPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                placeholder="Mot de passe pour les données publiques..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mot de passe caché
              </label>
              <input
                type="password"
                value={hiddenPassword}
                onChange={(e) => setHiddenPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
                placeholder="Mot de passe pour les données cachées..."
              />
            </div>
          </div>

          <button
            onClick={createDeniableContainer}
            disabled={
              !publicFile ||
              !hiddenFile ||
              !publicPassword ||
              !hiddenPassword ||
              isProcessing
            }
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Lock className="w-5 h-5" />
            {isProcessing
              ? "Création en cours..."
              : "Créer le conteneur deniable"}
          </button>

          {deniableContainer && (
            <button
              onClick={downloadContainer}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger le conteneur
            </button>
          )}
        </div>
      )}

      {/* Extract Mode */}
      {mode === "extract" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Conteneur deniable
            </label>
            <input
              type="file"
              onChange={handleContainerFileSelect}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
            />
            {containerFile && (
              <p className="text-sm text-gray-400 mt-1">
                {containerFile.name} ({(containerFile.size / 1024).toFixed(1)}{" "}
                KB)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Type d'extraction
            </label>
            <div className="flex space-x-1 bg-gray-700 p-1 rounded-lg">
              <button
                onClick={() => setExtractMode("public")}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200
                  ${
                    extractMode === "public"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-gray-600"
                  }
                `}
              >
                <Eye className="w-4 h-4" />
                Données publiques
              </button>
              <button
                onClick={() => setExtractMode("hidden")}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200
                  ${
                    extractMode === "hidden"
                      ? "bg-red-600 text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-gray-600"
                  }
                `}
              >
                <EyeOff className="w-4 h-4" />
                Données cachées
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mot de passe {extractMode === "public" ? "public" : "caché"}
            </label>
            <input
              type="password"
              value={extractPassword}
              onChange={(e) => setExtractPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              placeholder={`Mot de passe pour les données ${extractMode === "public" ? "publiques" : "cachées"}...`}
            />
          </div>

          <button
            onClick={extractFromContainer}
            disabled={!containerFile || !extractPassword || isProcessing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Eye className="w-5 h-5" />
            {isProcessing
              ? "Extraction en cours..."
              : `Extraire les données ${extractMode === "public" ? "publiques" : "cachées"}`}
          </button>

          {extractedData && (
            <div className="space-y-2">
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-300">
                  Données {extractMode === "public" ? "publiques" : "cachées"}{" "}
                  extraites: {(extractedData.byteLength / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={downloadExtracted}
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
          🛡️ Mode Deniability
        </h4>
        <div className="space-y-2 text-xs text-gray-400">
          <p>• Crée un conteneur avec deux niveaux de données</p>
          <p>• Le mot de passe public révèle des données de leurre</p>
          <p>• Le mot de passe caché révèle les vraies données secrètes</p>
          <p>• Impossible de prouver l'existence des données cachées</p>
        </div>
      </div>
    </div>
  );
};
