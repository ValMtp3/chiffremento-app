import React from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { OperationProgress } from '../types/crypto';

interface OperationProgressProps {
  progress?: OperationProgress;
  isComplete?: boolean;
  hasError?: boolean;
  error?: string;
}

export const OperationProgressComponent: React.FC<OperationProgressProps> = ({
  progress,
  isComplete,
  hasError,
  error
}) => {
  if (!progress && !isComplete && !hasError) return null;

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        {hasError ? (
          <XCircle className="w-5 h-5 text-red-500" />
        ) : isComplete ? (
          <CheckCircle className="w-5 h-5 text-green-500" />
        ) : (
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        )}

        <h3 className="text-lg font-semibold text-white">
          {hasError ? 'Erreur' : isComplete ? 'Terminé' : 'En cours...'}
        </h3>
      </div>

      {progress && !isComplete && !hasError && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-300">{progress.message}</span>
            <span className="text-gray-400">{progress.progress}%</span>
          </div>

          <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>

          <div className="text-sm text-gray-400">
            Étape: {progress.stage}
          </div>
        </div>
      )}

      {hasError && error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {isComplete && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-400">
            ✅ Opération terminée avec succès!
          </p>
          <p className="text-green-300 text-sm mt-2">
            Le fichier a été téléchargé automatiquement.
          </p>
        </div>
      )}
    </div>
  );
};
