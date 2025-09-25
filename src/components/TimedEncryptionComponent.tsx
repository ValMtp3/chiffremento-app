import React, { useState, useCallback, useEffect } from "react";
import { Clock, Download, Upload, Timer, AlertTriangle } from "lucide-react";
import { CryptoUtils } from "../utils/crypto";

interface TimedEncryptionComponentProps {}

export const TimedEncryptionComponent: React.FC<
  TimedEncryptionComponentProps
> = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [timedFile, setTimedFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [destructionTime, setDestructionTime] = useState(24); // heures
  const [destructionUnit, setDestructionUnit] = useState<
    "minutes" | "hours" | "days"
  >("hours");
  const [timedData, setTimedData] = useState<ArrayBuffer | null>(null);
  const [decryptedData, setDecryptedData] = useState<ArrayBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<"encrypt" | "decrypt">("encrypt");
  const [error, setError] = useState<string>("");
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Convertir le temps en millisecondes
  const getDestructionTimeMs = useCallback(() => {
    const multipliers = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
    };
    return destructionTime * multipliers[destructionUnit];
  }, [destructionTime, destructionUnit]);

  // Formater le temps restant
  const formatTimeRemaining = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}j ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }, []);

  // Vérifier l'expiration périodiquement
  useEffect(() => {
    if (!timedFile) return;

    const checkExpiration = async () => {
      try {
        const fileData = await timedFile.arrayBuffer();
        const result = CryptoUtils.checkTimedDecryption(fileData);

        if (result.expired) {
          setIsExpired(true);
          setTimeRemaining(0);
        } else {
          // Calculer le temps restant approximatif
          const currentTime = Date.now();
          const metadata = extractMetadata(fileData);
          if (metadata) {
            const remaining = metadata.destructionTime - currentTime;
            setTimeRemaining(Math.max(0, remaining));
            setIsExpired(remaining <= 0);
          }
        }
      } catch (err) {
        console.error("Erreur lors de la vérification:", err);
      }
    };

    checkExpiration();
    const interval = setInterval(checkExpiration, 1000);
    return () => clearInterval(interval);
  }, [timedFile]);

  const extractMetadata = (data: ArrayBuffer) => {
    try {
      const array = new Uint8Array(data);
      const metadataSize = new DataView(data).getUint32(0, false);
      const metadataBytes = array.slice(4, 4 + metadataSize);
      return JSON.parse(new TextDecoder().decode(metadataBytes));
    } catch {
      return null;
    }
  };

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        setError("");
      }
    },
    [],
  );

  const handleTimedFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        setTimedFile(file);
        setError("");
        setIsExpired(false);
        setTimeRemaining(null);
      }
    },
    [],
  );

  const createTimedEncryption = async () => {
    if (!selectedFile || !password) {
      setError("Veuillez sélectionner un fichier et entrer un mot de passe");
      return;
    }

    try {
      setIsProcessing(true);
      setError("");

      const fileData = await selectedFile.arrayBuffer();
      const destructionTimeMs = getDestructionTimeMs();

      const timedEncryption = CryptoUtils.createTimedEncryption(
        fileData,
        password,
        destructionTimeMs,
      );

      setTimedData(timedEncryption);
    } catch (err) {
      setError(`Erreur lors du chiffrement: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const decryptTimedFile = async () => {
    if (!timedFile || !password) {
      setError(
        "Veuillez sélectionner un fichier temporisé et entrer le mot de passe",
      );
      return;
    }

    try {
      setIsProcessing(true);
      setError("");

      const fileData = await timedFile.arrayBuffer();
      const result = CryptoUtils.checkTimedDecryption(fileData);

      if (result.expired) {
        setError("⚠️ Ce fichier a expiré et s'est auto-détruit");
        setIsExpired(true);
        return;
      }

      if (result.data) {
        setDecryptedData(result.data);
      }
    } catch (err) {
      setError(`Erreur lors du déchiffrement: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTimedFile = () => {
    if (!timedData || !selectedFile) return;

    const blob = new Blob([timedData]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timed_${selectedFile.name}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDecryptedFile = () => {
    if (!decryptedData || !timedFile) return;

    const blob = new Blob([decryptedData]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = timedFile.name.replace("timed_", "");
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <Timer className="w-6 h-6 text-orange-500" />
        <h3 className="text-xl font-semibold text-white">
          Chiffrement Temporisé
        </h3>
      </div>

      {/* Mode Selection */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => setMode("encrypt")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200
              ${
                mode === "encrypt"
                  ? "bg-orange-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              }
            `}
          >
            <Clock className="w-4 h-4" />
            Créer chiffrement temporisé
          </button>
          <button
            onClick={() => setMode("decrypt")}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200
              ${
                mode === "decrypt"
                  ? "bg-orange-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              }
            `}
          >
            <Download className="w-4 h-4" />
            Déchiffrer fichier temporisé
          </button>
        </div>
      </div>

      {/* Encrypt Mode */}
      {mode === "encrypt" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fichier à chiffrer
            </label>
            <input
              type="file"
              onChange={handleFileSelect}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-600 file:text-white hover:file:bg-orange-700"
            />
            {selectedFile && (
              <p className="text-sm text-gray-400 mt-1">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              placeholder="Mot de passe pour le chiffrement..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Temps avant auto-destruction
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max="365"
                value={destructionTime}
                onChange={(e) =>
                  setDestructionTime(parseInt(e.target.value) || 1)
                }
                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              />
              <select
                value={destructionUnit}
                onChange={(e) => setDestructionUnit(e.target.value as any)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Heures</option>
                <option value="days">Jours</option>
              </select>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Le fichier s'auto-détruira dans {destructionTime}{" "}
              {destructionUnit}
            </p>
          </div>

          <button
            onClick={createTimedEncryption}
            disabled={!selectedFile || !password || isProcessing}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Clock className="w-5 h-5" />
            {isProcessing
              ? "Création en cours..."
              : "Créer le chiffrement temporisé"}
          </button>

          {timedData && (
            <button
              onClick={downloadTimedFile}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger le fichier temporisé
            </button>
          )}
        </div>
      )}

      {/* Decrypt Mode */}
      {mode === "decrypt" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fichier temporisé
            </label>
            <input
              type="file"
              onChange={handleTimedFileSelect}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-600 file:text-white hover:file:bg-orange-700"
            />
            {timedFile && (
              <p className="text-sm text-gray-400 mt-1">
                {timedFile.name} ({(timedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Time Status */}
          {timedFile && timeRemaining !== null && (
            <div
              className={`bg-gray-700 rounded-lg p-3 border-l-4 ${
                isExpired
                  ? "border-red-500"
                  : timeRemaining < 60000
                    ? "border-yellow-500"
                    : "border-green-500"
              }`}
            >
              <div className="flex items-center gap-2">
                {isExpired ? (
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                ) : (
                  <Timer className="w-5 h-5 text-orange-500" />
                )}
                <p className="text-sm text-gray-300">
                  {isExpired ? (
                    <span className="text-red-400">
                      ⚠️ Fichier expiré - Auto-détruit
                    </span>
                  ) : (
                    <>
                      Temps restant:{" "}
                      <span className="font-mono">
                        {formatTimeRemaining(timeRemaining)}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white"
              placeholder="Mot de passe pour déchiffrer..."
              disabled={isExpired}
            />
          </div>

          <button
            onClick={decryptTimedFile}
            disabled={!timedFile || !password || isProcessing || isExpired}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            {isProcessing
              ? "Déchiffrement en cours..."
              : "Déchiffrer le fichier"}
          </button>

          {decryptedData && (
            <div className="space-y-2">
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-300">
                  Fichier déchiffré:{" "}
                  {(decryptedData.byteLength / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={downloadDecryptedFile}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Télécharger le fichier déchiffré
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
          ⏰ Chiffrement Temporisé
        </h4>
        <div className="space-y-2 text-xs text-gray-400">
          <p>• Les fichiers s'auto-détruisent après le délai défini</p>
          <p>• Une fois expiré, le contenu devient irrécupérable</p>
          <p>• Idéal pour des informations sensibles temporaires</p>
          <p>• Le décompte se base sur l'horloge système</p>
        </div>
      </div>
    </div>
  );
};
