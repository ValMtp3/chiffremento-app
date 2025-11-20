import { useState } from "react";
import {
  Shield,
  FileText,
  Download,
  Upload,
  Image,
  Eye,
  Clock,
} from "lucide-react";
import { FileDropZone } from "./components/FileDropZone";
import { PasswordGeneratorComponent } from "./components/PasswordGenerator";
import { EncryptionOptionsComponent } from "./components/EncryptionOptions";
import { OperationProgressComponent } from "./components/OperationProgress";
import { SteganographyComponent } from "./components/SteganographyComponent";
import { DeniabilityComponent } from "./components/DeniabilityComponent";
import { TimedEncryptionComponent } from "./components/TimedEncryptionComponent";
import { FileEncryptionService } from "./utils/fileEncryption";
import {
  EncryptionOptions,
  OperationProgress,
  EncryptedFile,
} from "./types/crypto";

type Tab = "encrypt" | "decrypt" | "steganography" | "deniability" | "timed";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("encrypt");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileToDecrypt, setFileToDecrypt] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OperationProgress | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState("");

  const [encryptionOptions, setEncryptionOptions] = useState<EncryptionOptions>(
    {
      algorithm: "aes-256-gcm",
      password: "",
      compress: true,
      fragment: false,
      fragmentSize: 10 * 1024 * 1024, // 10MB
      paranoidMode: false,
      addTimestamp: true,
    },
  );

  const tabs = [
    { id: "encrypt" as Tab, label: "Chiffrement", icon: Shield },
    { id: "decrypt" as Tab, label: "Déchiffrement", icon: FileText },
    { id: "steganography" as Tab, label: "Stéganographie", icon: Image },
    { id: "deniability" as Tab, label: "Deniability", icon: Eye },
    { id: "timed" as Tab, label: "Temporisé", icon: Clock },
  ];

  const resetState = () => {
    setProgress(null);
    setIsComplete(false);
    setHasError(false);
    setError("");
    // Libérer la mémoire du fichier chiffré précédent
    setFileToDecrypt(null);
  };

  const handleEncrypt = async () => {
    if (!selectedFile || !password) return;

    try {
      resetState();
      setIsProcessing(true);

      const options = { ...encryptionOptions, password };
      const result = await FileEncryptionService.encryptFile(
        selectedFile,
        options,
        setProgress,
      );

      // Libérer immédiatement le fichier original pour économiser la mémoire
      setSelectedFile(null);

      // Télécharger automatiquement
      try {
        const blob = new Blob([result.encryptedData], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${result.originalName}.encrypted`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Nettoyer l'URL immédiatement
        setTimeout(() => URL.revokeObjectURL(url), 100);

        setIsComplete(true);
      } catch {
        // Même en cas d'erreur de téléchargement, on considère le chiffrement réussi
        setIsComplete(true);
        console.warn("Téléchargement automatique échoué, le fichier a été chiffré avec succès");
      }
    } catch (err) {
      setHasError(true);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecrypt = async () => {
    if (!fileToDecrypt || !password) return;

    try {
      resetState();
      setIsProcessing(true);

      // Lire le fichier chiffré
      const fileData = await fileToDecrypt.arrayBuffer();

      // Créer un objet EncryptedFile temporaire pour la compatibilité
      const tempEncryptedFile: EncryptedFile = {
        id: "temp",
        originalName: fileToDecrypt.name.replace('.encrypted', ''),
        encryptedData: fileData,
        metadata: {
          algorithm: "aes-256-gcm", // Sera détecté automatiquement
          timestamp: Date.now(),
          compressed: false,
          fragmented: false,
          checksum: "",
          deniable: false,
          steganographic: false,
          timed: false,
          errorCorrection: false,
        }
      };

      const result = await FileEncryptionService.decryptFile(
        tempEncryptedFile,
        password,
        setProgress,
      );

      // Libérer immédiatement le fichier chiffré
      setFileToDecrypt(null);

      // Créer un lien de téléchargement
      try {
        const blob = new Blob([result.data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Nettoyer l'URL immédiatement
        setTimeout(() => URL.revokeObjectURL(url), 100);

        setIsComplete(true);
      } catch {
        // Même en cas d'erreur de téléchargement, on considère le déchiffrement réussi
        setIsComplete(true);
        console.warn("Téléchargement automatique échoué, le fichier a été déchiffré avec succès");
      }
    } catch (err) {
      setHasError(true);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePasswordGenerated = (newPassword: string) => {
    setPassword(newPassword);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-2xl font-bold">Chiffremento</h1>
              <p className="text-gray-400">
                Application de chiffrement sécurisée
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex justify-center">
          <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200 whitespace-nowrap
                  ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-gray-700"
                  }
                `}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {/* Onglet Chiffrement */}
        {activeTab === "encrypt" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <FileDropZone
                onFileSelect={setSelectedFile}
                selectedFile={selectedFile || undefined}
                onClearFile={() => setSelectedFile(null)}
              />

              {/* Générateur de mot de passe intégré */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  Mot de passe de chiffrement
                </h3>
                <PasswordGeneratorComponent
                  onPasswordGenerated={handlePasswordGenerated}
                  currentPassword={password}
                  onPasswordChange={setPassword}
                />
              </div>

              <button
                onClick={handleEncrypt}
                disabled={!selectedFile || !password || isProcessing}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Chiffrer le Fichier
              </button>


            </div>

            <div className="space-y-6">
              <EncryptionOptionsComponent
                options={encryptionOptions}
                onOptionsChange={setEncryptionOptions}
              />

              <OperationProgressComponent
                progress={progress || undefined}
                isComplete={isComplete}
                hasError={hasError}
                error={error}
              />
            </div>
          </div>
        )}

        {/* Onglet Déchiffrement */}
        {activeTab === "decrypt" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  Fichier à déchiffrer
                </h3>
                <input
                  type="file"
                  accept=".encrypted"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setFileToDecrypt(file);
                    }
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-orange-600 file:text-white hover:file:bg-orange-700 transition-colors"
                />
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-500" />
                  Mot de passe de déchiffrement
                </h3>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                    placeholder="Entrez le mot de passe de déchiffrement..."
                  />
                </div>
              </div>

              <button
                onClick={handleDecrypt}
                disabled={!fileToDecrypt || !password || isProcessing}
                className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Déchiffrer le Fichier
              </button>
            </div>

            <div>
              <OperationProgressComponent
                progress={progress || undefined}
                isComplete={isComplete}
                hasError={hasError}
                error={error}
              />
            </div>
          </div>
        )}

        {/* Onglet Stéganographie */}
        {activeTab === "steganography" && (
          <div className="max-w-4xl mx-auto">
            <SteganographyComponent />
          </div>
        )}

        {/* Onglet Deniability */}
        {activeTab === "deniability" && (
          <div className="max-w-4xl mx-auto">
            <DeniabilityComponent />
          </div>
        )}

        {/* Onglet Chiffrement Temporisé */}
        {activeTab === "timed" && (
          <div className="max-w-4xl mx-auto">
            <TimedEncryptionComponent />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
