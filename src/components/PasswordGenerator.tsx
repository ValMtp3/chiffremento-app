import React, { useState } from "react";
import { RefreshCw, Copy, Eye, EyeOff, Zap, Key, FileText } from "lucide-react";
import { PasswordGenerator } from "../utils/crypto";
import { PasswordOptions } from "../types/crypto";

interface PasswordGeneratorProps {
  onPasswordGenerated?: (password: string) => void;
  currentPassword?: string;
  onPasswordChange?: (password: string) => void;
}

export const PasswordGeneratorComponent: React.FC<PasswordGeneratorProps> = ({
  onPasswordGenerated,
  currentPassword = "",
  onPasswordChange,
}) => {
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [generationType, setGenerationType] = useState<
    "password" | "passphrase"
  >("password");
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: true,
    includePassphrase: false,
    passphraseWords: 6,
  });

  const generatePassword = () => {
    try {
      let newPassword: string;
      if (generationType === "passphrase") {
        newPassword = PasswordGenerator.generatePassphrase(
          options.passphraseWords || 6,
        );
      } else {
        newPassword = PasswordGenerator.generate(options);
      }
      setGeneratedPassword(newPassword);
    } catch (error) {
      console.error("Erreur lors de la génération:", error);
    }
  };

  const copyToClipboard = async () => {
    const passwordToCopy = currentPassword || generatedPassword;
    if (passwordToCopy) {
      try {
        await navigator.clipboard.writeText(passwordToCopy);
      } catch (err) {
        console.error("Erreur lors de la copie:", err);
      }
    }
  };

  const useGeneratedPassword = () => {
    if (generatedPassword) {
      onPasswordChange?.(generatedPassword);
      onPasswordGenerated?.(generatedPassword);
    }
  };

  const passwordToAnalyze = currentPassword || generatedPassword;
  const strength = passwordToAnalyze
    ? PasswordGenerator.calculateStrength(passwordToAnalyze)
    : null;

  return (
    <div className="space-y-4">
      {/* Input principal de mot de passe */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => onPasswordChange?.(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 pr-12 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            placeholder="Entrez un mot de passe sécurisé ou générez-en un..."
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded"
              title={
                showPassword
                  ? "Masquer le mot de passe"
                  : "Afficher le mot de passe"
              }
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={copyToClipboard}
              disabled={!currentPassword}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 p-1 rounded"
              title="Copier le mot de passe"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Indicateur de force du mot de passe */}
        {strength && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Force du mot de passe :</span>
              <span className={`font-medium ${strength.color}`}>
                {strength.label} ({strength.score}/10)
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  strength.score <= 3
                    ? "bg-red-500"
                    : strength.score <= 6
                      ? "bg-yellow-500"
                      : strength.score <= 8
                        ? "bg-blue-500"
                        : "bg-green-500"
                }`}
                style={{ width: `${(strength.score / 10) * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-400">
              Entropie : {strength.entropy.toFixed(1)} bits
            </div>
          </div>
        )}
      </div>

      {/* Outils de génération */}
      <div className="border-t border-gray-600 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Key className="w-4 h-4 text-yellow-500" />
          <h5 className="text-sm font-medium text-gray-300">
            Générateur automatique
          </h5>
        </div>

        {/* Sélection du type */}
        <div className="mb-4">
          <div className="flex space-x-1 bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setGenerationType("password")}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 text-sm
                ${
                  generationType === "password"
                    ? "bg-yellow-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-gray-600"
                }
              `}
            >
              <Zap className="w-3 h-3" />
              Mot de passe
            </button>
            <button
              onClick={() => setGenerationType("passphrase")}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200 text-sm
                ${
                  generationType === "passphrase"
                    ? "bg-yellow-600 text-white shadow-lg"
                    : "text-gray-400 hover:text-white hover:bg-gray-600"
                }
              `}
            >
              <FileText className="w-3 h-3" />
              Phrase secrète
            </button>
          </div>
        </div>

        {/* Options de génération */}
        {generationType === "password" && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Longueur: {options.length} caractères
              </label>
              <input
                type="range"
                min={8}
                max={64}
                value={options.length}
                onChange={(e) =>
                  setOptions({ ...options, length: parseInt(e.target.value) })
                }
                className="w-full accent-yellow-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={options.uppercase}
                  onChange={(e) =>
                    setOptions({ ...options, uppercase: e.target.checked })
                  }
                  className="rounded accent-yellow-600"
                />
                Majuscules
              </label>

              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={options.lowercase}
                  onChange={(e) =>
                    setOptions({ ...options, lowercase: e.target.checked })
                  }
                  className="rounded accent-yellow-600"
                />
                Minuscules
              </label>

              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={options.numbers}
                  onChange={(e) =>
                    setOptions({ ...options, numbers: e.target.checked })
                  }
                  className="rounded accent-yellow-600"
                />
                Chiffres
              </label>

              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={options.symbols}
                  onChange={(e) =>
                    setOptions({ ...options, symbols: e.target.checked })
                  }
                  className="rounded accent-yellow-600"
                />
                Symboles
              </label>
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={options.excludeAmbiguous}
                onChange={(e) =>
                  setOptions({ ...options, excludeAmbiguous: e.target.checked })
                }
                className="rounded accent-yellow-600 mt-0.5"
              />
              <span>Exclure les caractères ambigus (0, O, 1, l, I)</span>
            </label>
          </div>
        )}

        {generationType === "passphrase" && (
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">
              Nombre de mots: {options.passphraseWords}
            </label>
            <input
              type="range"
              min={4}
              max={8}
              value={options.passphraseWords || 6}
              onChange={(e) =>
                setOptions({
                  ...options,
                  passphraseWords: parseInt(e.target.value),
                })
              }
              className="w-full accent-yellow-600"
            />
          </div>
        )}

        {/* Aperçu du mot de passe généré */}
        {generatedPassword && (
          <div className="mb-4 p-3 bg-gray-700 border border-gray-600 rounded-lg">
            <div className="text-xs text-gray-400 mb-1">
              Mot de passe généré :
            </div>
            <div className="font-mono text-sm text-white break-all">
              {showPassword
                ? generatedPassword
                : "•".repeat(generatedPassword.length)}
            </div>
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-2">
          <button
            onClick={generatePassword}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            Générer
          </button>
          {generatedPassword && (
            <button
              onClick={useGeneratedPassword}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Utiliser ce mot de passe
            </button>
          )}
        </div>

        {/* Conseils */}
        <div className="mt-4 p-3 bg-gray-700 rounded-lg">
          <div className="text-xs text-gray-400 space-y-1">
            <div className="font-medium text-gray-300 mb-2">
              💡 Conseils de sécurité
            </div>
            {generationType === "password" ? (
              <>
                <p>• Utilisez au moins 12 caractères</p>
                <p>• Mélangez différents types de caractères</p>
                <p>• Évitez les mots du dictionnaire</p>
              </>
            ) : (
              <>
                <p>• Les phrases secrètes sont faciles à retenir</p>
                <p>
                  • 6 mots = sécurité équivalente à un mot de passe complexe
                </p>
                <p>• Plus mémorables que les caractères aléatoires</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
