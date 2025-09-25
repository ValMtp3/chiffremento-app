// Types pour l'application de chiffrement avancée
export interface EncryptionAlgorithm {
  id: string;
  name: string;
  description: string;
  keyLength: number;
  blockSize?: number;
  performance: "high" | "medium" | "low";
  security: "high" | "very-high" | "military";
}

export interface EncryptionOptions {
  algorithm: string;
  password: string;
  compress: boolean;
  fragment: boolean;
  fragmentSize: number;
  paranoidMode: boolean;
  addTimestamp: boolean;
  selfDestruct?: number;
  deniabilityMode?: boolean;
  hiddenPassword?: string;
  steganography?: boolean;
  reedSolomon?: boolean;
}

export interface EncryptedFile {
  id: string;
  originalName: string;
  encryptedData: ArrayBuffer;
  metadata: {
    algorithm: string;
    timestamp: number;
    compressed: boolean;
    fragmented: boolean;
    fragments?: number;
    checksum: string;
    deniable?: boolean;
    steganographic?: boolean;
    timed?: boolean;
    destructionTime?: number;
    errorCorrection?: boolean;
  };
}

export interface DeniableContainer {
  id: string;
  publicData: ArrayBuffer;
  hiddenData?: ArrayBuffer;
  publicPassword: string;
  hiddenPassword?: string;
  metadata: {
    totalSize: number;
    publicSize: number;
    hiddenSize?: number;
    hiddenOffset?: number;
  };
}

export interface SteganographicFile {
  id: string;
  originalImage: ArrayBuffer;
  hiddenData: ArrayBuffer;
  modifiedImage: ArrayBuffer;
  metadata: {
    imageFormat: string;
    hiddenDataSize: number;
    compressionUsed: boolean;
  };
}

export interface TimedEncryption {
  id: string;
  encryptedData: ArrayBuffer;
  metadata: {
    creationTime: number;
    destructionTime: number;
    algorithm: string;
    expired: boolean;
  };
}

export interface ErrorCorrectedData {
  id: string;
  originalData: ArrayBuffer;
  protectedData: ArrayBuffer;
  metadata: {
    originalSize: number;
    redundancyLevel: number;
    checksumsCount: number;
    correctable: boolean;
  };
}

export interface OperationProgress {
  stage: string;
  progress: number;
  message: string;
  details?: string;
}

export interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  includePassphrase?: boolean;
  passphraseWords?: number;
}

export interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  entropy: number;
  suggestions?: string[];
}

export interface SecurityLevel {
  id: string;
  name: string;
  description: string;
  algorithms: string[];
  features: {
    paranoidMode: boolean;
    deniability: boolean;
    steganography: boolean;
    timedDestruction: boolean;
    errorCorrection: boolean;
  };
}
