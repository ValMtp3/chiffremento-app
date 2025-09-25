import React, { useState, useCallback } from "react";
import {
  Shield,
  Eye,
  EyeOff,
  Download,
  Upload,
  Lock,
  AlertTriangle,
} from "lucide-react";
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
  const [success, setSuccess] = useState<string>("");
  const [containerInfo, setContainerInfo] = useState<{
    publicSize: number;
    hiddenSize: number;
    totalSize: number;
  } | null>(null);

  const handlePublicFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (file.size === 0) {
          setError("Le fichier public ne peut pas être vide");
          return;
        }
        if (file.size > 100 * 1024 * 1024) {
          setError("Fichier public trop volumineux (limite: 100MB)");
          return;
        }
        setPublicFile(file);
        setError("");
        setSuccess("");
      }
    },
    [],
  );

  const handleHiddenFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (file.size === 0) {
          setError("Le fichier caché ne peut pas être vide");
          return;
        }
        if (file.size > 50 * 1024 * 1024) {
          setError("Fichier caché trop volumineux (limite: 50MB)");
          return;
        }
        // Vérifier le ratio de taille recommandé
        if (publicFile && file.size > publicFile.size * 0.3) {
          setError(
            "Le fichier caché devrait être plus petit que 30% du fichier public pour plus de sécurité",
          );
          return;
        }
        setHiddenFile(file);
        setError("");
        setSuccess("");
      }
    },
    [publicFile],
  );

  const handleContainerFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (file.size === 0) {
          setError("Le fichier conteneur ne peut pas être vide");
          return;
        }
        if (!file.name.endsWith(".deniable")) {
          setError("Sélectionnez un fichier conteneur (.deniable)");
          return;
        }
        setContainerFile(file);
        setError("");
        setSuccess("");
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

    if (publicPassword.length < 12 || hiddenPassword.length < 12) {
      setError("Les mots de passe doivent contenir au moins 12 caractères");
      return;
    }

    try {
      setIsProcessing(true);
      setError("");
      setSuccess("");

      const publicData = await publicFile.arrayBuffer();
      const hiddenData = await hiddenFile.arrayBuffer();

      // Validation des tailles
      if (hiddenData.byteLength > publicData.byteLength * 0.3) {
        throw new Error(
          "Le fichier caché est trop volumineux par rapport au fichier public",
        );
      }

      const container = await CryptoUtils.createDeniableContainer(
        publicData,
        hiddenData,
        publicPassword,
        hiddenPassword,
      );

      setDeniableContainer(container);
      setContainerInfo({
        publicSize: publicData.byteLength,
        hiddenSize: hiddenData.byteLength,
        totalSize: container.byteLength,
      });

      setSuccess("Conteneur deniable créé avec succès!");

      // Nettoyer les mots de passe après utilisation
      setPublicPassword("");
      setHiddenPassword("");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(`Erreur lors de la création: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const extractFromContainer = async () => {
    if (!containerFile || !extractPassword) {
      setError("Veuillez sélectionner un conteneur et entrer un mot de passe");
      return;
    }

    if (extractPassword.length < 12) {
      setError("Le mot de passe doit contenir au moins 12 caractères");
      return;
    }

    try {
      setIsProcessing(true);
      setError("");
      setSuccess("");

      const containerData = await containerFile.arrayBuffer();

      if (extractMode === "public") {
        // Extraction des données publiques (toujours au début du conteneur)
        const headerSize = 256;
        const container = new Uint8Array(containerData);
        const publicSalt = container.slice(0, 32);
        const publicIV = container.slice(32, 44);

        // Les données publiques sont stockées après le header
        const publicDataStart = headerSize;
        const publicData = container.slice(publicDataStart);

        // Tentative de déchiffrement des données publiques avec le mot de passe fourni
        try {
          const { key } = await CryptoUtils.deriveKey(
            extractPassword,
            publicSalt,
            "aes-256-gcm",
          );
          const decryptedPublic = await CryptoUtils.decryptAES(
            publicData.buffer,
            key,
            publicIV,
          );
          setExtractedData(decryptedPublic);
          setSuccess("Données publiques extraites avec succès!");
        } catch (decryptError) {
          throw new Error("Mot de passe public incorrect");
        }
      } else {
        // Extraction des données cachées
        try {
          const hiddenData = await CryptoUtils.extractHiddenData(
            containerData,
            extractPassword,
          );
          setExtractedData(hiddenData);
          setSuccess("Données cachées extraites avec succès!");
        } catch (extractError) {
          if (
            extractError instanceof Error &&
            extractError.message.includes("Mot de passe incorrect")
          ) {
            throw new Error(
              "Mot de passe caché incorrect ou aucune donnée cachée trouvée",
            );
          } else {
            throw extractError;
          }
        }
      }

      // Nettoyer le mot de passe après utilisation
      setExtractPassword("");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(`Erreur lors de l'extraction: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadContainer = () => {
    if (!deniableContainer) return;

    const blob = new Blob([deniableContainer], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deniable_container_${Date.now()}.deniable`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExtracted = () => {
    if (!extractedData) return;

    const blob = new Blob([extractedData], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extracted_${extractMode}_data_${Date.now()}.bin`;
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
                Mot de passe public (minimum 12 caractères)
              </label>
              <input
                type="password"
                value={publicPassword}
                onChange={(e) => setPublicPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder="Mot de passe fort pour les données publiques..."
                minLength={12}
              />
              {publicPassword && publicPassword.length < 12 && (
                <p className="text-red-400 text-xs mt-1">
                  Minimum 12 caractères requis
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mot de passe caché (minimum 12 caractères)
              </label>
              <input
                type="password"
                value={hiddenPassword}
                onChange={(e) => setHiddenPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                placeholder="Mot de passe fort pour les données cachées..."
                minLength={12}
              />
              {hiddenPassword && hiddenPassword.length < 12 && (
                <p className="text-red-400 text-xs mt-1">
                  Minimum 12 caractères requis
                </p>
              )}
              {publicPassword &&
                hiddenPassword &&
                publicPassword === hiddenPassword && (
                  <p className="text-red-400 text-xs mt-1">
                    Doit être différent du mot de passe public
                  </p>
                )}
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
            <div className="space-y-3">
              {containerInfo && (
                <div className="bg-gray-700 rounded-lg p-3 text-sm">
                  <h5 className="text-green-400 font-medium mb-2">
                    Conteneur créé
                  </h5>
                  <div className="space-y-1 text-gray-300">
                    <p>
                      Données publiques:{" "}
                      {(containerInfo.publicSize / 1024).toFixed(1)} KB
                    </p>
                    <p>
                      Données cachées:{" "}
                      {(containerInfo.hiddenSize / 1024).toFixed(1)} KB
                    </p>
                    <p>
                      Taille totale:{" "}
                      {(containerInfo.totalSize / 1024).toFixed(1)} KB
                    </p>
                    <p>
                      Efficacité:{" "}
                      {(
                        ((containerInfo.totalSize -
                          containerInfo.publicSize -
                          containerInfo.hiddenSize) /
                          containerInfo.totalSize) *
                        100
                      ).toFixed(1)}
                      % de bruit cryptographique
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={downloadContainer}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Télécharger le conteneur (.deniable)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Extract Mode */}
      {mode === "extract" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Conteneur deniable (.deniable)
            </label>
            <input
              type="file"
              accept=".deniable"
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
              Mot de passe {extractMode === "public" ? "public" : "caché"}{" "}
              (minimum 12 caractères)
            </label>
            <input
              type="password"
              value={extractPassword}
              onChange={(e) => setExtractPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder={`Mot de passe pour les données ${extractMode === "public" ? "publiques" : "cachées"}...`}
              minLength={12}
            />
            {extractPassword && extractPassword.length < 12 && (
              <p className="text-red-400 text-xs mt-1">
                Minimum 12 caractères requis
              </p>
            )}
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

      {/* Success/Error Display */}
      {success && (
        <div className="mt-4 bg-green-900/50 border border-green-600 rounded-lg p-3">
          <p className="text-green-400 text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" />
            {success}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-900/50 border border-red-600 rounded-lg p-3">
          <p className="text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 bg-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">
          🛡️ Sécurité Avancée - Mode Deniability
        </h4>
        <div className="space-y-2 text-xs text-gray-400">
          <p>
            • <strong>Chiffrement AES-256-GCM</strong> pour les données
            publiques
          </p>
          <p>
            • <strong>Chiffrement Twofish-256-CBC</strong> pour les données
            cachées
          </p>
          <p>
            • <strong>Position cryptographique</strong> des données cachées
            basée sur SHA-256
          </p>
          <p>
            • <strong>Bruit cryptographique</strong> pour masquer les vraies
            tailles
          </p>
          <p>
            • <strong>Sels uniques</strong> de 32 bytes pour chaque couche
          </p>
          <p>
            • <strong>PBKDF2</strong> avec 1M iterations pour ralentir les
            attaques
          </p>
          <p>
            • <strong>Déni plausible</strong>: impossible de prouver l'existence
            des données cachées
          </p>
          <p>
            • <strong>Recommandation</strong>: fichier caché ≤ 30% du fichier
            public
          </p>
        </div>
      </div>
    </div>
  );
};
