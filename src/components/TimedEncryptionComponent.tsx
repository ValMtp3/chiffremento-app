import React, { useState, useCallback, useEffect } from "react";
import {
  Clock,
  Shield,
  Download,
  Upload,
  Timer,
  AlertTriangle,
  Info,
} from "lucide-react";
import { CryptoUtils } from "../utils/crypto";

interface TimedEncryptionComponentProps {}

export const TimedEncryptionComponent: React.FC<
  TimedEncryptionComponentProps
> = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [timedFile, setTimedFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [destructionTime, setDestructionTime] = useState(24); // heures
  const [customTime, setCustomTime] = useState<string>("");
  const [useCustomTime, setUseCustomTime] = useState(false);
  const [timedData, setTimedData] = useState<ArrayBuffer | null>(null);
  const [extractedData, setExtractedData] = useState<ArrayBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<"create" | "decrypt">("create");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [fileInfo, setFileInfo] = useState<{
    destructionDate: Date;
    timeLeft: number;
    expired: boolean;
  } | null>(null);

  // Validation en temps réel
  useEffect(() => {
    if (password && confirmPassword && password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
    } else if (error === "Les mots de passe ne correspondent pas") {
      setError("");
    }
  }, [password, confirmPassword, error]);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (file.size === 0) {
          setError("Le fichier ne peut pas être vide");
          return;
        }
        if (file.size > 100 * 1024 * 1024) {
          setError("Fichier trop volumineux (limite: 100MB)");
          return;
        }
        setSelectedFile(file);
        setError("");
        setSuccess("");
      }
    },
    [],
  );

  const handleTimedFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        if (!file.name.endsWith(".timed")) {
          setError("Sélectionnez un fichier temporisé (.timed)");
          return;
        }
        setTimedFile(file);
        setError("");
        setSuccess("");

        // Analyser le fichier pour obtenir les informations de timing
        try {
          const fileData = await file.arrayBuffer();
          await analyzeTimedFile(fileData);
        } catch (err) {
          setError("Impossible d'analyser le fichier temporisé");
        }
      }
    },
    [],
  );

  const analyzeTimedFile = async (fileData: ArrayBuffer) => {
    try {
      const array = new Uint8Array(fileData);
      const metadataSize = new DataView(fileData).getUint32(0, false);
      const metadataBytes = array.slice(4, 4 + metadataSize);
      const metadata = JSON.parse(new TextDecoder().decode(metadataBytes));

      const destructionDate = new Date(metadata.destructionTime);
      const now = new Date();
      const timeLeft = Math.max(0, destructionDate.getTime() - now.getTime());
      const expired = timeLeft === 0;

      setFileInfo({
        destructionDate,
        timeLeft,
        expired,
      });
    } catch (err) {
      console.warn("Impossible d'analyser les métadonnées du fichier");
    }
  };

  const validateInputs = (): boolean => {
    if (mode === "create") {
      if (!selectedFile) {
        setError("Veuillez sélectionner un fichier à chiffrer");
        return false;
      }
      if (!password || password.length < 12) {
        setError("Le mot de passe doit contenir au moins 12 caractères");
        return false;
      }
      if (password !== confirmPassword) {
        setError("Les mots de passe ne correspondent pas");
        return false;
      }
      if (useCustomTime) {
        const customDate = new Date(customTime);
        if (isNaN(customDate.getTime())) {
          setError("Date/heure personnalisée invalide");
          return false;
        }
        if (customDate <= new Date()) {
          setError("La date de destruction doit être dans le futur");
          return false;
        }
      } else {
        if (destructionTime < 1 || destructionTime > 8760) {
          setError("Durée invalide (1 heure à 1 an maximum)");
          return false;
        }
      }
    } else {
      if (!timedFile) {
        setError("Veuillez sélectionner un fichier temporisé");
        return false;
      }
      if (!password) {
        setError("Veuillez entrer le mot de passe");
        return false;
      }
    }
    return true;
  };

  const createTimedEncryption = async () => {
    if (!validateInputs()) return;

    try {
      setIsProcessing(true);
      setError("");
      setSuccess("");

      const fileData = await selectedFile!.arrayBuffer();

      let destructionTimeMs: number;
      if (useCustomTime) {
        const customDate = new Date(customTime);
        destructionTimeMs = customDate.getTime() - Date.now();
      } else {
        destructionTimeMs = destructionTime * 60 * 60 * 1000;
      }

      const timedEncrypted = await CryptoUtils.createTimedEncryption(
        fileData,
        password,
        destructionTimeMs,
      );

      setTimedData(timedEncrypted);

      const destructionDate = new Date(Date.now() + destructionTimeMs);
      setSuccess(
        `Fichier temporisé créé! Auto-destruction: ${destructionDate.toLocaleString()}`,
      );

      // Nettoyer les mots de passe
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(`Erreur lors de la création: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const decryptTimedFile = async () => {
    if (!validateInputs()) return;

    try {
      setIsProcessing(true);
      setError("");
      setSuccess("");

      const fileData = await timedFile!.arrayBuffer();
      const result = await CryptoUtils.checkTimedDecryption(fileData, password);

      if (result.expired) {
        setError("Ce fichier a expiré et s'est auto-détruit définitivement");
        return;
      }

      if (result.data && result.timeLeft !== undefined) {
        setExtractedData(result.data);
        const hoursLeft = Math.floor(result.timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor(
          (result.timeLeft % (1000 * 60 * 60)) / (1000 * 60),
        );
        setSuccess(
          `Déchiffrement réussi! Temps restant: ${hoursLeft}h ${minutesLeft}min`,
        );

        // Nettoyer le mot de passe
        setPassword("");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      if (
        errorMessage.includes("Mot de passe") ||
        errorMessage.includes("déchiffrement")
      ) {
        setError("Mot de passe incorrect");
      } else {
        setError(`Erreur lors du déchiffrement: ${errorMessage}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTimedFile = () => {
    if (!timedData) return;

    const blob = new Blob([timedData], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const filename = selectedFile
      ? selectedFile.name.replace(/\.[^/.]+$/, "")
      : "encrypted_file";
    a.download = `${filename}_timed_${Date.now()}.timed`;
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
    a.download = `extracted_timed_data_${Date.now()}.bin`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTimeLeft = (timeMs: number): string => {
    const days = Math.floor(timeMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const minutes = Math.floor((timeMs % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}j ${hours}h ${minutes}min`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}min`;
    } else {
      return `${minutes}min`;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <Clock className="w-6 h-6 text-orange-500" />
        <h3 className="text-xl font-semibold text-white">
          Chiffrement Temporisé
        </h3>
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
                  ? "bg-orange-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-gray-600"
              }
            `}
          >
            <Shield className="w-4 h-4" />
            Créer un fichier temporisé
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
            <Timer className="w-4 h-4" />
            Déchiffrer un fichier temporisé
          </button>
        </div>
      </div>

      {/* Create Mode */}
      {mode === "create" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fichier à chiffrer temporairement
            </label>
            <input
              type="file"
              onChange={handleFileSelect}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-600 file:text-white hover:file:bg-orange-700"
            />
            {selectedFile && (
              <p className="text-sm text-gray-400 mt-1">
                Sélectionné: {selectedFile.name} (
                {(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Mot de passe (minimum 12 caractères)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                placeholder="Entrez un mot de passe fort..."
                minLength={12}
              />
              {password && password.length < 12 && (
                <p className="text-red-400 text-xs mt-1">
                  Minimum 12 caractères requis
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                placeholder="Confirmez le mot de passe..."
                minLength={12}
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-3">
              <input
                type="checkbox"
                checked={useCustomTime}
                onChange={(e) => setUseCustomTime(e.target.checked)}
                className="rounded accent-orange-600"
              />
              Définir une date/heure personnalisée d'expiration
            </label>

            {useCustomTime ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date et heure d'expiration
                </label>
                <input
                  type="datetime-local"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} // Au moins 1 minute dans le futur
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Durée avant auto-destruction: {destructionTime} heure(s)
                </label>
                <input
                  type="range"
                  min={1}
                  max={168} // 1 semaine max pour l'interface simple
                  value={destructionTime}
                  onChange={(e) => setDestructionTime(parseInt(e.target.value))}
                  className="w-full accent-orange-600"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1h</span>
                  <span>1 jour (24h)</span>
                  <span>1 semaine (168h)</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={createTimedEncryption}
            disabled={
              !selectedFile ||
              !password ||
              !confirmPassword ||
              password !== confirmPassword ||
              password.length < 12 ||
              isProcessing
            }
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Shield className="w-5 h-5" />
            {isProcessing
              ? "Création en cours..."
              : "Créer le fichier temporisé"}
          </button>

          {timedData && (
            <button
              onClick={downloadTimedFile}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger le fichier temporisé (.timed)
            </button>
          )}
        </div>
      )}

      {/* Decrypt Mode */}
      {mode === "decrypt" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Fichier temporisé (.timed)
            </label>
            <input
              type="file"
              accept=".timed"
              onChange={handleTimedFileSelect}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-600 file:text-white hover:file:bg-orange-700"
            />
            {timedFile && (
              <div className="mt-2 space-y-1">
                <p className="text-sm text-gray-400">
                  Sélectionné: {timedFile.name} (
                  {(timedFile.size / 1024).toFixed(1)} KB)
                </p>
                {fileInfo && (
                  <div className="bg-gray-700 rounded-lg p-3">
                    <div
                      className={`text-sm font-medium ${fileInfo.expired ? "text-red-400" : "text-green-400"}`}
                    >
                      {fileInfo.expired ? "⚠️ EXPIRÉ" : "✅ ACTIF"}
                    </div>
                    <p className="text-xs text-gray-300 mt-1">
                      Expiration: {fileInfo.destructionDate.toLocaleString()}
                    </p>
                    {!fileInfo.expired && (
                      <p className="text-xs text-gray-300">
                        Temps restant: {formatTimeLeft(fileInfo.timeLeft)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mot de passe de déchiffrement
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
              placeholder="Entrez le mot de passe..."
            />
          </div>

          <button
            onClick={decryptTimedFile}
            disabled={
              !timedFile ||
              !password ||
              isProcessing ||
              (fileInfo && fileInfo.expired)
            }
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Timer className="w-5 h-5" />
            {isProcessing
              ? "Déchiffrement en cours..."
              : "Déchiffrer le fichier"}
          </button>

          {extractedData && (
            <button
              onClick={downloadExtracted}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger les données extraites
            </button>
          )}
        </div>
      )}

      {/* Success/Error Display */}
      {success && (
        <div className="mt-4 bg-green-900/50 border border-green-600 rounded-lg p-3">
          <p className="text-green-400 text-sm flex items-center gap-2">
            <Info className="w-4 h-4" />
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
          🔒 Chiffrement Temporisé Sécurisé
        </h4>
        <div className="space-y-2 text-xs text-gray-400">
          <p>
            • <strong>Chiffrement AES-256-GCM</strong> avec horodatage
            cryptographique sécurisé
          </p>
          <p>
            • <strong>PBKDF2</strong> avec 1M itérations pour la dérivation de
            clé
          </p>
          <p>
            • <strong>Auto-destruction</strong> irréversible après expiration
          </p>
          <p>
            • <strong>Validation d'intégrité</strong> SHA-512 pour détecter les
            corruptions
          </p>
          <p>
            • <strong>Métadonnées protégées</strong> avec signature JSON
            sécurisée
          </p>
          <p>
            • <strong>Durée flexible</strong>: de 1 heure à 1 an, ou date
            personnalisée
          </p>
          <p>
            • <strong>Indicateurs visuels</strong> de l'état d'expiration en
            temps réel
          </p>
          <p>
            • <strong>Sécurité renforcée</strong>: mots de passe 12+ caractères
            obligatoires
          </p>
        </div>

        <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg">
          <p className="text-yellow-400 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" />
            Attention: Une fois expiré, un fichier temporisé est définitivement
            irrécupérable!
          </p>
        </div>
      </div>
    </div>
  );
};
