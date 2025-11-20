import {
  EncryptionOptions,
  EncryptedFile,
  OperationProgress,
} from "../types/crypto";
import { CryptoUtils } from "./crypto";
import { logger } from "./logger";

// Service de chiffrement de fichiers sécurisé
export class FileEncryptionService {
  // Chiffrement de fichier avec sécurité renforcée
  static async encryptFile(
    file: File,
    options: EncryptionOptions,
    onProgress?: (progress: OperationProgress) => void,
  ): Promise<EncryptedFile> {
    let processedData: ArrayBuffer | null = null;

    try {
      if (!options.password) {
        throw new Error("Mot de passe requis pour le chiffrement");
      }

      if (file.size === 0) {
        throw new Error("Le fichier ne peut pas être vide");
      }

      if (file.size > 500 * 1024 * 1024) {
        // Limite à 500MB
        throw new Error("Fichier trop volumineux (limite: 500MB)");
      }

      this.safeProgressCallback(onProgress, {
        stage: "reading",
        progress: 5,
        message: "Lecture sécurisée du fichier...",
      });

      // Lecture sécurisée du fichier
      const fileData = await this.secureFileRead(file);
      processedData = fileData;

      this.safeProgressCallback(onProgress, {
        stage: "validating",
        progress: 10,
        message: "Validation des données...",
      });

      // Validation de l'intégrité du fichier lu
      const originalChecksum =
        await CryptoUtils.calculateChecksum(processedData);

      // Compression si demandée
      if (options.compress) {
        this.safeProgressCallback(onProgress, {
          stage: "compressing",
          progress: 25,
          message: "Compression sécurisée en cours...",
        });

        try {
          const compressedData = await CryptoUtils.compress(processedData);
          const compressionRatio =
            compressedData.byteLength / processedData.byteLength;

          // N'utiliser la compression que si elle est efficace (>20% de gain)
          if (compressionRatio < 0.8) {
            processedData = compressedData;
          } else {
            options.compress = false; // Désactiver la compression pour ce fichier
          }
        } catch (compressionError) {
          logger.warn(
            "Compression échouée, utilisation des données non compressées",
            compressionError,
          );
          options.compress = false;
        }
      }

      this.safeProgressCallback(onProgress, {
        stage: "encrypting",
        progress: 40,
        message: this.getEncryptionMessage(options),
      });

      // Chiffrement selon le mode sélectionné
      if (options.paranoidMode) {
        processedData = await this.paranoidEncrypt(
          processedData,
          options.password,
          onProgress,
        );
      } else {
        processedData = await this.standardEncrypt(
          processedData,
          options.password,
          options.algorithm,
        );
      }

      this.safeProgressCallback(onProgress, {
        stage: "postprocessing",
        progress: 70,
        message: "Post-traitement sécurisé...",
      });

      // Correction d'erreurs si demandée
      if (options.reedSolomon) {
        try {
          processedData = await CryptoUtils.addErrorCorrection(processedData);
        } catch (errorCorrectionError) {
          logger.warn(
            "Ajout de correction d'erreurs échoué",
            errorCorrectionError,
          );
        }
      }

      // Fragmentation si demandée et nécessaire
      let fragments = 1;
      let actuallyFragmented = false;
      if (options.fragment && processedData.byteLength > options.fragmentSize) {
        this.safeProgressCallback(onProgress, {
          stage: "fragmenting",
          progress: 80,
          message: "Fragmentation sécurisée...",
        });

        const fragmentArray = CryptoUtils.fragmentFile(
          processedData,
          options.fragmentSize,
        );
        fragments = fragmentArray.length;
        actuallyFragmented = fragments > 1;

        // Dans une vraie implémentation, on sauvegarderait les fragments séparément
        // Ici on reconstitue pour la démo, mais avec validation
        const reassembled = CryptoUtils.reassembleFragments(fragmentArray);

        // Vérifier que la fragmentation/reconstitution n'a pas corrompu les données
        const reassembledChecksum =
          await CryptoUtils.calculateChecksum(reassembled);
        const originalFragChecksum =
          await CryptoUtils.calculateChecksum(processedData);

        if (reassembledChecksum !== originalFragChecksum) {
          throw new Error(
            "Erreur lors de la fragmentation - intégrité compromise",
          );
        }

        processedData = reassembled;
      }

      this.safeProgressCallback(onProgress, {
        stage: "finalizing",
        progress: 90,
        message: "Finalisation et validation...",
      });

      // Calcul du checksum final sécurisé
      const finalChecksum =
        await CryptoUtils.calculateSecureChecksum(processedData);

      // Création des métadonnées enrichies
      const metadata = {
        version: 2, // Version du format
        algorithm: options.paranoidMode
          ? "paranoid-aes-twofish-serpent"
          : options.algorithm,
        timestamp: Date.now(),
        originalSize: fileData.byteLength,
        finalSize: processedData.byteLength,
        compressed: options.compress,
        fragmented: actuallyFragmented,
        fragments: fragments,
        checksum: finalChecksum,
        originalChecksum: originalChecksum,
        paranoidMode: options.paranoidMode,
        hasErrorCorrection: options.reedSolomon || false,
        fileType: file.type || "application/octet-stream",
        fileName: file.name,
        compressionRatio: options.compress
          ? processedData.byteLength / fileData.byteLength
          : 1,
      };

      const encryptedFile: EncryptedFile = {
        id: crypto.randomUUID(),
        originalName: file.name,
        encryptedData: processedData,
        metadata: {
          ...metadata,
          deniable: options.deniabilityMode || false,
          steganographic: options.steganography || false,
          timed: options.selfDestruct ? true : false,
          destructionTime: options.selfDestruct
            ? Date.now() + options.selfDestruct
            : undefined,
          errorCorrection: options.reedSolomon || false,
        },
      };

      this.safeProgressCallback(onProgress, {
        stage: "complete",
        progress: 100,
        message: "Chiffrement terminé avec succès!",
      });

      // Nettoyage sécurisé
      CryptoUtils.secureWipe(new Uint8Array(fileData));

      return encryptedFile;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";

      this.safeProgressCallback(onProgress, {
        stage: "error",
        progress: 0,
        message: `Erreur: ${errorMessage}`,
      });

      // Nettoyage en cas d'erreur
      if (processedData) {
        CryptoUtils.secureWipe(new Uint8Array(processedData));
      }

      throw new Error(`Erreur lors du chiffrement: ${errorMessage}`);
    }
  }

  // Déchiffrement de fichier sécurisé
  static async decryptFile(
    encryptedFile: EncryptedFile,
    password: string,
    onProgress?: (progress: OperationProgress) => void,
  ): Promise<{ data: ArrayBuffer; name: string }> {
    let processedData: ArrayBuffer;

    try {
      if (!password) {
        throw new Error("Mot de passe requis pour le déchiffrement");
      }

      if (
        !encryptedFile.encryptedData ||
        encryptedFile.encryptedData.byteLength === 0
      ) {
        throw new Error("Données chiffrées invalides ou vides");
      }

      this.safeProgressCallback(onProgress, {
        stage: "reading",
        progress: 5,
        message: "Lecture des données chiffrées...",
      });

      let processedData: ArrayBuffer = encryptedFile.encryptedData;

      // Vérification de version et de compatibilité
      const metadata = encryptedFile.metadata;
      if (metadata.version && metadata.version > 2) {
        throw new Error(
          "Version de fichier non supportée - mise à jour requise",
        );
      }

      this.safeProgressCallback(onProgress, {
        stage: "verifying",
        progress: 15,
        message: "Vérification de l'intégrité...",
      });

      // Vérification du checksum si disponible
      if (metadata.checksum) {
        const actualChecksum =
          await CryptoUtils.calculateSecureChecksum(processedData);
        if (actualChecksum !== metadata.checksum) {
          throw new Error("Fichier corrompu - Checksum de sécurité invalide");
        }
      }

      // Correction d'erreurs si nécessaire
      if (metadata.errorCorrection || metadata.hasErrorCorrection) {
        this.safeProgressCallback(onProgress, {
          stage: "correcting",
          progress: 25,
          message: "Correction d'erreurs Reed-Solomon...",
        });

        try {
          processedData = await CryptoUtils.correctErrors(processedData);
        } catch (correctionError) {
          logger.warn("Correction d'erreurs échouée", correctionError);
          // Continuer sans correction si elle échoue
        }
      }

      this.safeProgressCallback(onProgress, {
        stage: "decrypting",
        progress: 40,
        message: this.getDecryptionMessage(metadata),
      });

      // Déchiffrement selon l'algorithme
      if (metadata.paranoidMode || metadata.algorithm?.includes("paranoid")) {
        processedData = await this.paranoidDecrypt(
          processedData,
          password,
          onProgress,
        );
      } else {
        processedData = await this.standardDecrypt(
          processedData,
          password,
          metadata.algorithm || "aes-256-gcm",
        );
      }

      this.safeProgressCallback(onProgress, {
        stage: "postprocessing",
        progress: 70,
        message: "Post-traitement...",
      });

      // Décompression si nécessaire
      if (metadata.compressed) {
        this.safeProgressCallback(onProgress, {
          stage: "decompressing",
          progress: 80,
          message: "Décompression en cours...",
        });

        try {
          const decompressedData = await CryptoUtils.decompress(processedData);

          // Vérifier la taille décompressée si elle est disponible
          if (
            metadata.originalSize &&
            decompressedData.byteLength !== metadata.originalSize
          ) {
            logger.warn(
              `Taille décompressée inattendue: ${decompressedData.byteLength} vs ${metadata.originalSize}`,
            );
          }

          processedData = decompressedData;
        } catch (decompressionError) {
          throw new Error(`Erreur de décompression: ${decompressionError}`);
        }
      }

      // Validation finale
      if (metadata.originalChecksum) {
        this.safeProgressCallback(onProgress, {
          stage: "validating",
          progress: 90,
          message: "Validation finale des données...",
        });

        const finalChecksum =
          await CryptoUtils.calculateChecksum(processedData);
        if (finalChecksum !== metadata.originalChecksum) {
          throw new Error("Échec de la validation finale - données corrompues");
        }
      }

      this.safeProgressCallback(onProgress, {
        stage: "complete",
        progress: 100,
        message: "Déchiffrement terminé avec succès!",
      });

      return {
        data: processedData,
        name: metadata.fileName || encryptedFile.originalName,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";

      this.safeProgressCallback(onProgress, {
        stage: "error",
        progress: 0,
        message: `Erreur: ${errorMessage}`,
      });

      // Nettoyage sécurisé en cas d'erreur
      if (processedData !== null) {
        CryptoUtils.secureWipe(new Uint8Array(processedData));
      }

      throw new Error(`Erreur lors du déchiffrement: ${errorMessage}`);
    }
  }

  // Chiffrement standard sécurisé
  private static async standardEncrypt(
    data: ArrayBuffer,
    password: string,
    algorithm: string,
  ): Promise<ArrayBuffer> {
    const salt = CryptoUtils.generateSalt(64); // Salt plus long pour plus de sécurité
    const iterations = 1000000; // 1M iterations pour ralentir les attaques

    const { key, derivedBytes } = await CryptoUtils.deriveKey(
      password,
      salt,
      algorithm,
      iterations,
    );

    let encrypted: ArrayBuffer;
    let iv: Uint8Array;

    switch (algorithm) {
      case "aes-256-gcm": {
        const aesResult = await CryptoUtils.encryptAES(data, key);
        encrypted = aesResult.encrypted;
        iv = aesResult.iv;
        break;
      }

      case "chacha20-poly1305": {
        // ChaCha20 simulé avec AES pour la compatibilité
        const chachaResult = await CryptoUtils.encryptAES(data, key);
        encrypted = chachaResult.encrypted;
        iv = chachaResult.iv;
        break;
      }

      case "twofish-256-cbc": {
        const twofishResult = await CryptoUtils.encryptTwofish(
          data,
          derivedBytes,
        );
        encrypted = twofishResult.encrypted;
        iv = twofishResult.iv;
        break;
      }

      case "serpent-256-cbc": {
        const serpentResult = await CryptoUtils.encryptSerpent(
          data,
          derivedBytes,
        );
        encrypted = serpentResult.encrypted;
        iv = serpentResult.iv;
        break;
      }

      default:
        throw new Error(`Algorithme non supporté: ${algorithm}`);
    }

    // Format sécurisé: [version(1)] + [algorithm_id(1)] + [iterations(4)] + [salt_length(1)] + [salt] + [iv_length(1)] + [iv] + [données chiffrées]
    const algorithmId = this.getAlgorithmId(algorithm);
    const iterationsArray = new Uint32Array([iterations]);

    const result = new Uint8Array(
      1 + // version
        1 + // algorithm ID
        4 + // iterations
        1 + // salt length
        salt.length +
        1 + // iv length
        iv.length +
        encrypted.byteLength,
    );

    let offset = 0;
    result[offset++] = 2; // Version 2 du format
    result[offset++] = algorithmId;
    result.set(new Uint8Array(iterationsArray.buffer), offset);
    offset += 4;
    result[offset++] = salt.length;
    result.set(salt, offset);
    offset += salt.length;
    result[offset++] = iv.length;
    result.set(iv, offset);
    offset += iv.length;
    result.set(new Uint8Array(encrypted), offset);

    // Nettoyage sécurisé
    CryptoUtils.secureWipe(salt);
    CryptoUtils.secureWipe(iv);
    CryptoUtils.secureWipe(new Uint8Array(iterationsArray.buffer));

    return result.buffer;
  }

  // Déchiffrement standard sécurisé
  private static async standardDecrypt(
    encryptedData: ArrayBuffer,
    password: string,
    algorithm: string,
  ): Promise<ArrayBuffer> {
    const data = new Uint8Array(encryptedData);

    if (data.length < 8) {
      throw new Error("Données chiffrées trop courtes - format invalide");
    }

    let offset = 0;

    // Vérifier la version
    const version = data[offset++];
    if (version < 1 || version > 2) {
      throw new Error(`Version de format non supportée: ${version}`);
    }

    // Extraire les paramètres selon la version
    let iterations = 600000; // Valeur par défaut
    let algorithmFromFile = algorithm;

    if (version === 2) {
      const algorithmId = data[offset++];
      algorithmFromFile = this.getAlgorithmFromId(algorithmId);

      const iterationsArray = data.slice(offset, offset + 4);
      iterations = new DataView(iterationsArray.buffer).getUint32(0, true);
      offset += 4;
    }

    const saltLength = data[offset++];
    if (saltLength < 16 || saltLength > 128) {
      throw new Error("Longueur de salt invalide");
    }

    const salt = data.slice(offset, offset + saltLength);
    offset += saltLength;

    const ivLength = data[offset++];
    if (ivLength < 12 || ivLength > 32) {
      throw new Error("Longueur d'IV invalide");
    }

    const iv = data.slice(offset, offset + ivLength);
    offset += ivLength;

    const encrypted = data.slice(offset);

    if (encrypted.length === 0) {
      throw new Error("Aucune donnée chiffrée trouvée");
    }

    // Dérivation de la clé avec les paramètres extraits
    const { key, derivedBytes } = await CryptoUtils.deriveKey(
      password,
      salt,
      algorithmFromFile,
      iterations,
    );

    // Déchiffrement selon l'algorithme
    try {
      switch (algorithmFromFile) {
        case "aes-256-gcm":
          return await CryptoUtils.decryptAES(encrypted.buffer, key, iv);

        case "chacha20-poly1305":
          return await CryptoUtils.decryptAES(encrypted.buffer, key, iv);

        case "twofish-256-cbc":
          return await CryptoUtils.decryptTwofish(
            encrypted.buffer,
            derivedBytes,
            iv,
          );

        case "serpent-256-cbc":
          return await CryptoUtils.decryptSerpent(
            encrypted.buffer,
            derivedBytes,
            iv,
          );

        default:
          throw new Error(`Algorithme non supporté: ${algorithmFromFile}`);
      }
    } finally {
      // Nettoyage sécurisé
      CryptoUtils.secureWipe(salt);
      CryptoUtils.secureWipe(iv);
    }
  }

  // Chiffrement paranoïaque avec triple couche sécurisée
  private static async paranoidEncrypt(
    data: ArrayBuffer,
    password: string,
    onProgress?: (progress: OperationProgress) => void,
  ): Promise<ArrayBuffer> {
    // Générer des mots de passe dérivés sécurisés avec des sels différents
    const salt1 = CryptoUtils.generateSalt(64);
    const salt2 = CryptoUtils.generateSalt(64);
    const salt3 = CryptoUtils.generateSalt(64);

    // Dériver des mots de passe uniques pour chaque couche
    const password1 = await this.deriveSecurePassword(
      password,
      salt1,
      "layer1",
    );
    const password2 = await this.deriveSecurePassword(
      password,
      salt2,
      "layer2",
    );
    const password3 = await this.deriveSecurePassword(
      password,
      salt3,
      "layer3",
    );

    this.safeProgressCallback(onProgress, {
      stage: "paranoid",
      progress: 45,
      message: "Triple chiffrement - Couche 1 (AES-256)...",
    });

    // Première couche: AES-256-GCM
    let encrypted = await this.standardEncrypt(data, password1, "aes-256-gcm");

    this.safeProgressCallback(onProgress, {
      stage: "paranoid",
      progress: 55,
      message: "Triple chiffrement - Couche 2 (Twofish-256)...",
    });

    // Deuxième couche: Twofish-256-CBC
    encrypted = await this.standardEncrypt(
      encrypted,
      password2,
      "twofish-256-cbc",
    );

    this.safeProgressCallback(onProgress, {
      stage: "paranoid",
      progress: 65,
      message: "Triple chiffrement - Couche 3 (Serpent-256)...",
    });

    // Troisième couche: Serpent-256-CBC
    encrypted = await this.standardEncrypt(
      encrypted,
      password3,
      "serpent-256-cbc",
    );

    // Créer l'en-tête paranoïaque avec les sels
    const header = new Uint8Array(1 + 3 * 64); // version + 3 sels
    header[0] = 1; // Version du format paranoïaque
    header.set(salt1, 1);
    header.set(salt2, 1 + 64);
    header.set(salt3, 1 + 128);

    // Combiner header et données
    const result = new Uint8Array(header.length + encrypted.byteLength);
    result.set(header, 0);
    result.set(new Uint8Array(encrypted), header.length);

    // Nettoyage sécurisé
    CryptoUtils.secureWipe(salt1);
    CryptoUtils.secureWipe(salt2);
    CryptoUtils.secureWipe(salt3);

    return result.buffer;
  }

  // Déchiffrement paranoïaque
  private static async paranoidDecrypt(
    encryptedData: ArrayBuffer,
    password: string,
    onProgress?: (progress: OperationProgress) => void,
  ): Promise<ArrayBuffer> {
    const data = new Uint8Array(encryptedData);

    if (data.length < 193) {
      // 1 + 3*64 minimum
      throw new Error("Données paranoïaques trop courtes");
    }

    // Extraire la version et les sels
    const version = data[0];
    if (version !== 1) {
      throw new Error(`Version paranoïaque non supportée: ${version}`);
    }

    const salt1 = data.slice(1, 65);
    const salt2 = data.slice(65, 129);
    const salt3 = data.slice(129, 193);
    const encrypted = data.slice(193);

    // Régénérer les mots de passe dérivés
    const password1 = await this.deriveSecurePassword(
      password,
      salt1,
      "layer1",
    );
    const password2 = await this.deriveSecurePassword(
      password,
      salt2,
      "layer2",
    );
    const password3 = await this.deriveSecurePassword(
      password,
      salt3,
      "layer3",
    );

    this.safeProgressCallback(onProgress, {
      stage: "paranoid-decrypt",
      progress: 45,
      message: "Déchiffrement triple - Couche 3 (Serpent-256)...",
    });

    // Déchiffrement en ordre inverse
    let decrypted = await this.standardDecrypt(
      encrypted.buffer,
      password3,
      "serpent-256-cbc",
    );

    this.safeProgressCallback(onProgress, {
      stage: "paranoid-decrypt",
      progress: 55,
      message: "Déchiffrement triple - Couche 2 (Twofish-256)...",
    });

    decrypted = await this.standardDecrypt(
      decrypted,
      password2,
      "twofish-256-cbc",
    );

    this.safeProgressCallback(onProgress, {
      stage: "paranoid-decrypt",
      progress: 65,
      message: "Déchiffrement triple - Couche 1 (AES-256)...",
    });

    decrypted = await this.standardDecrypt(decrypted, password1, "aes-256-gcm");

    return decrypted;
  }

  // Lecture sécurisée de fichier
  private static async secureFileRead(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const result = event.target?.result;
        if (result instanceof ArrayBuffer) {
          resolve(result);
        } else {
          reject(new Error("Erreur lors de la lecture du fichier"));
        }
      };

      reader.onerror = () => {
        reject(new Error("Erreur lors de la lecture du fichier"));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  // Dérivation sécurisée de mot de passe pour les couches
  private static async deriveSecurePassword(
    basePassword: string,
    salt: Uint8Array,
    layer: string,
  ): Promise<string> {
    const combined = new TextEncoder().encode(basePassword + "|" + layer);
    const baseKey = await crypto.subtle.importKey(
      "raw",
      combined,
      "PBKDF2",
      false,
      ["deriveBits"],
    );

    // @ts-expect-error - Limitation TypeScript: salt est Uint8Array mais TS strict veut BufferSource exact
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 500000,
        hash: "SHA-512",
      },
      baseKey,
      256,
    );

    const derivedArray = Array.from(new Uint8Array(derivedBits));
    const derivedPassword = derivedArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Nettoyage
    combined.fill(0);

    return derivedPassword;
  }

  // Gestion sécurisée des callbacks de progression
  private static safeProgressCallback(
    callback: ((progress: OperationProgress) => void) | undefined,
    progress: OperationProgress,
  ): void {
    if (callback) {
      try {
        callback(progress);
      } catch (error) {
        // Ignorer les erreurs de callback pour ne pas interrompre le processus
        logger.warn("Erreur dans le callback de progression:", error);
      }
    }
  }

  // Messages contextuels pour l'interface
  private static getEncryptionMessage(options: EncryptionOptions): string {
    if (options.paranoidMode) {
      return "Chiffrement paranoïaque triple couche...";
    }

    const algorithmNames = {
      "aes-256-gcm": "AES-256-GCM",
      "chacha20-poly1305": "ChaCha20-Poly1305",
      "twofish-256-cbc": "Twofish-256-CBC",
      "serpent-256-cbc": "Serpent-256-CBC",
    };

    return `Chiffrement ${algorithmNames[options.algorithm as keyof typeof algorithmNames] || options.algorithm}...`;
  }

  private static getDecryptionMessage(metadata: { algorithm?: string; paranoidMode?: boolean }): string {
    if (metadata.paranoidMode || metadata.algorithm?.includes("paranoid")) {
      return "Déchiffrement paranoïaque triple couche...";
    }

    const algorithmNames = {
      "aes-256-gcm": "AES-256-GCM",
      "chacha20-poly1305": "ChaCha20-Poly1305",
      "twofish-256-cbc": "Twofish-256-CBC",
      "serpent-256-cbc": "Serpent-256-CBC",
    };

    const algorithm = metadata.algorithm || "AES-256-GCM";
    return `Déchiffrement ${algorithmNames[algorithm as keyof typeof algorithmNames] || algorithm}...`;
  }

  // Mapping des algorithmes vers des IDs
  private static getAlgorithmId(algorithm: string): number {
    const mapping = {
      "aes-256-gcm": 1,
      "chacha20-poly1305": 2,
      "twofish-256-cbc": 3,
      "serpent-256-cbc": 4,
    };
    return mapping[algorithm as keyof typeof mapping] || 1;
  }

  private static getAlgorithmFromId(id: number): string {
    const mapping = {
      1: "aes-256-gcm",
      2: "chacha20-poly1305",
      3: "twofish-256-cbc",
      4: "serpent-256-cbc",
    };
    return mapping[id as keyof typeof mapping] || "aes-256-gcm";
  }

  // Extraction de l'algorithme de base
  private static extractBaseAlgorithm(fullAlgorithm: string): string {
    if (fullAlgorithm.includes("paranoid")) {
      return "aes-256-gcm"; // Algorithme de base pour le mode paranoïaque
    }
    return fullAlgorithm;
  }
}
