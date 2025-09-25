import React from "react";
import {
  Shield,
  Zap,
  Settings,
  Clock,
  Eye,
  Image,
  AlertTriangle,
} from "lucide-react";
import { EncryptionOptions } from "../types/crypto";
import { ENCRYPTION_ALGORITHMS } from "../utils/crypto";

interface EncryptionOptionsProps {
  options: EncryptionOptions;
  onOptionsChange: (options: EncryptionOptions) => void;
}

export const EncryptionOptionsComponent: React.FC<EncryptionOptionsProps> = ({
  options,
  onOptionsChange,
}) => {
  const updateOptions = (updates: Partial<EncryptionOptions>) => {
    onOptionsChange({ ...options, ...updates });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-green-500" />
        <h3 className="text-lg font-semibold text-white">
          Options de Chiffrement
        </h3>
      </div>

      <div className="space-y-6">
        {/* Algorithme de chiffrement */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">
            Algorithme de Chiffrement
          </label>
          <div className="space-y-3">
            {ENCRYPTION_ALGORITHMS.map((algo) => (
              <div
                key={algo.id}
                className={`
                  p-4 rounded-lg border cursor-pointer transition-all duration-200
                  ${
                    options.algorithm === algo.id
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-gray-600 hover:border-gray-500"
                  }
                `}
                onClick={() => updateOptions({ algorithm: algo.id })}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    checked={options.algorithm === algo.id}
                    onChange={() => updateOptions({ algorithm: algo.id })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-semibold">{algo.name}</h4>
                      <span
                        className={`
                        px-2 py-1 rounded text-xs font-medium
                        ${
                          algo.security === "military"
                            ? "bg-red-500/20 text-red-400"
                            : algo.security === "very-high"
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-green-500/20 text-green-400"
                        }
                      `}
                      >
                        {algo.security === "military"
                          ? "Militaire"
                          : algo.security === "very-high"
                            ? "Très Haut"
                            : "Haut"}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">{algo.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Options de base */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
            <input
              type="checkbox"
              checked={options.compress}
              onChange={(e) => updateOptions({ compress: e.target.checked })}
              className="rounded"
            />
            <div>
              <span className="text-white font-medium">Compression</span>
              <p className="text-gray-400 text-sm">
                Réduire la taille avant chiffrement
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
            <input
              type="checkbox"
              checked={options.paranoidMode}
              onChange={(e) =>
                updateOptions({ paranoidMode: e.target.checked })
              }
              className="rounded"
            />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-white font-medium">Mode Paranoïaque</span>
                <Shield className="w-4 h-4 text-red-500" />
              </div>
              <p className="text-gray-400 text-sm">
                Triple chiffrement pour sécurité maximale
              </p>
            </div>
          </label>
        </div>

        {/* Options avancées */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
            <input
              type="checkbox"
              checked={options.reedSolomon || false}
              onChange={(e) => updateOptions({ reedSolomon: e.target.checked })}
              className="rounded"
            />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-white font-medium">Reed-Solomon</span>
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              </div>
              <p className="text-gray-400 text-sm">
                Correction d'erreurs avancée
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
            <input
              type="checkbox"
              checked={options.addTimestamp}
              onChange={(e) =>
                updateOptions({ addTimestamp: e.target.checked })
              }
              className="rounded"
            />
            <div>
              <span className="text-white font-medium">Ajouter horodatage</span>
              <p className="text-gray-400 text-sm">
                Inclure la date/heure dans les métadonnées
              </p>
            </div>
          </label>
        </div>

        {/* Fragmentation */}
        <div>
          <label className="flex items-center gap-3 mb-3">
            <input
              type="checkbox"
              checked={options.fragment}
              onChange={(e) => updateOptions({ fragment: e.target.checked })}
              className="rounded"
            />
            <span className="text-white font-medium">
              Fragmentation des fichiers
            </span>
          </label>

          {options.fragment && (
            <div className="ml-6">
              <label className="block text-sm text-gray-300 mb-2">
                Taille des fragments: {options.fragmentSize / (1024 * 1024)} MB
              </label>
              <input
                type="range"
                min={1024 * 1024} // 1MB
                max={1024 * 1024 * 1024} // 1GB
                step={1024 * 1024} // 1MB steps
                value={options.fragmentSize}
                onChange={(e) =>
                  updateOptions({ fragmentSize: parseInt(e.target.value) })
                }
                className="w-full"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
