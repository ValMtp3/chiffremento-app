import {
  EncryptionOptions,
  EncryptedFile,
  OperationProgress,
} from "../types/crypto";
import { CryptoUtils } from "./crypto";

export class FileEncryptionService {
  // Chiffrement de fichier principal
  static async encryptFile(
    file: File,
    options: EncryptionOptions,
    onProgress?: (progress: OperationProgress) => void,
  ): Promise<EncryptedFile> {
    try {
      if (!options.password) {
        throw new Error("Mot de passe requis");
      }

      try {
        onProgress?.({
          stage: "reading",
          progress: 10,
          message: "Lecture du fichier...",
        });
      } catch {
        // Ignore progress callback errors
      }

      const fileData = await file.arrayBuffer();
      let processedData = fileData;

      // Compression si demandée
      if (options.compress) {
        try {
          onProgress?.({
            stage: "compressing",
            progress: 30,
            message: "Compression en cours...",
          });
        } catch {
          // Ignore progress callback errors
        }
        processedData = await CryptoUtils.compress(processedData);
      }

      // Mode paranoïaque - triple chiffrement
      if (options.paranoidMode) {
        try {
          onProgress?.({
            stage: "paranoid",
            progress: 50,
            message: "Mode paranoïaque - Triple chiffrement...",
          });
        } catch {
          // Ignore progress callback errors
        }
        processedData = await this.tripleEncrypt(
          processedData,
          options.password,
          options.algorithm,
        );
      } else {
        // Chiffrement simple
        try {
          onProgress?.({
            stage: "encrypting",
            progress: 50,
            message: "Chiffrement en cours...",
          });
        } catch {
          // Ignore progress callback errors
        }
        processedData = await this.singleEncrypt(
          processedData,
          options.password,
          options.algorithm,
        );
      }

      // Fragmentation si demandée
      let fragments = 1;
      let actuallyFragmented = false;
      if (options.fragment && processedData.byteLength > options.fragmentSize) {
        try {
          onProgress?.({
            stage: "fragmenting",
            progress: 80,
            message: "Fragmentation du fichier...",
          });
        } catch {
          // Ignore progress callback errors
        }
        const fragmentArray = CryptoUtils.fragmentFile(
          processedData,
          options.fragmentSize,
        );
        fragments = fragmentArray.length;
        actuallyFragmented = fragments > 1;
        // Pour la simplicité, on reconstitue immédiatement, mais dans un vrai cas,
        // on sauvegarderait les fragments séparément
        processedData = CryptoUtils.reassembleFragments(fragmentArray);
      }

      // Calcul du checksum
      try {
        onProgress?.({
          stage: "finalizing",
          progress: 90,
          message: "Finalisation...",
        });
      } catch {
        // Ignore progress callback errors
      }
      const checksum = await CryptoUtils.calculateChecksum(processedData);

      const encryptedFile: EncryptedFile = {
        id: crypto.randomUUID(),
        originalName: file.name,
        encryptedData: processedData,
        metadata: {
          algorithm: options.paranoidMode
            ? "paranoid-triple"
            : options.algorithm,
          timestamp: Date.now(),
          compressed: options.compress,
          fragmented: actuallyFragmented,
          fragments: fragments,
          checksum: checksum,
          paranoidMode: options.paranoidMode,
        },
      };

      try {
        onProgress?.({
          stage: "complete",
          progress: 100,
          message: "Chiffrement terminé!",
        });
      } catch {
        // Ignore progress callback errors
      }
      return encryptedFile;
    } catch (error) {
      throw new Error(`Erreur lors du chiffrement: ${error.message}`);
    }
  }

  // Déchiffrement de fichier
  static async decryptFile(
    encryptedFile: EncryptedFile,
    password: string,
    onProgress?: (progress: OperationProgress) => void,
  ): Promise<{ data: ArrayBuffer; name: string }> {
    try {
      try {
        onProgress?.({
          stage: "reading",
          progress: 10,
          message: "Lecture du fichier chiffré...",
        });
      } catch {
        // Ignore progress callback errors
      }

      let processedData = encryptedFile.encryptedData;

      // Vérification du checksum
      try {
        onProgress?.({
          stage: "verifying",
          progress: 20,
          message: "Vérification de l'intégrité...",
        });
      } catch {
        // Ignore progress callback errors
      }
      const checksum = await CryptoUtils.calculateChecksum(processedData);
      if (checksum !== encryptedFile.metadata.checksum) {
        throw new Error("Fichier corrompu - Checksum invalide");
      }

      // Déchiffrement selon l'algorithme
      if (
        encryptedFile.metadata.paranoidMode ||
        encryptedFile.metadata.algorithm === "paranoid-triple"
      ) {
        try {
          onProgress?.({
            stage: "decrypting",
            progress: 50,
            message: "Déchiffrement triple en cours...",
          });
        } catch {
          // Ignore progress callback errors
        }
        // Pour le mode paranoïaque, on utilise l'algorithme de base (AES par défaut)
        const baseAlgorithm =
          encryptedFile.metadata.algorithm === "paranoid-triple"
            ? "aes-256-gcm"
            : encryptedFile.metadata.algorithm;
        processedData = await this.tripleDecrypt(
          processedData,
          password,
          baseAlgorithm,
        );
      } else {
        try {
          onProgress?.({
            stage: "decrypting",
            progress: 50,
            message: "Déchiffrement en cours...",
          });
        } catch {
          // Ignore progress callback errors
        }
        processedData = await this.singleDecrypt(
          processedData,
          password,
          encryptedFile.metadata.algorithm,
        );
      }

      // Décompression si nécessaire
      if (encryptedFile.metadata.compressed) {
        try {
          onProgress?.({
            stage: "decompressing",
            progress: 80,
            message: "Décompression en cours...",
          });
        } catch {
          // Ignore progress callback errors
        }
        processedData = await CryptoUtils.decompress(processedData);
      }

      try {
        onProgress?.({
          stage: "complete",
          progress: 100,
          message: "Déchiffrement terminé!",
        });
      } catch {
        // Ignore progress callback errors
      }

      return {
        data: processedData,
        name: encryptedFile.originalName,
      };
    } catch (error) {
      throw new Error(`Erreur lors du déchiffrement: ${error.message}`);
    }
  }

  // Chiffrement simple
  private static async singleEncrypt(
    data: ArrayBuffer,
    password: string,
    algorithm: string,
  ): Promise<ArrayBuffer> {
    const salt = CryptoUtils.generateSalt();
    const key = await CryptoUtils.deriveKey(password, salt, algorithm);

    let encrypted: ArrayBuffer;
    let iv: Uint8Array;

    switch (algorithm) {
      case "aes-256-gcm":
        const aesResult = await CryptoUtils.encryptAES(data, key);
        encrypted = aesResult.encrypted;
        iv = aesResult.iv;
        break;
      case "chacha20-poly1305":
        // Simuler ChaCha20 avec AES pour les tests
        const chachaResult = await CryptoUtils.encryptAES(data, key);
        encrypted = chachaResult.encrypted;
        iv = chachaResult.iv;
        break;
      case "twofish":
        const twofishResult = await CryptoUtils.encryptTwofish(data, key);
        encrypted = twofishResult.encrypted;
        iv = twofishResult.iv;
        break;
      case "serpent":
        const serpentResult = await CryptoUtils.encryptSerpent(data, key);
        encrypted = serpentResult.encrypted;
        iv = serpentResult.iv;
        break;
      default:
        throw new Error(`Algorithme non supporté: ${algorithm}`);
    }

    // Combiner [iv_length (1 byte)] + [salt (32 bytes)] + [iv] + [données chiffrées]
    const ivLength = iv.length;
    const result = new Uint8Array(
      1 + salt.length + ivLength + encrypted.byteLength,
    );

    result[0] = ivLength; // Stocker la longueur de l'IV
    result.set(salt, 1);
    result.set(iv, 1 + salt.length);
    result.set(new Uint8Array(encrypted), 1 + salt.length + ivLength);

    return result.buffer;
  }

  // Déchiffrement simple
  private static async singleDecrypt(
    encryptedData: ArrayBuffer,
    password: string,
    algorithm: string,
  ): Promise<ArrayBuffer> {
    const data = new Uint8Array(encryptedData);
    const ivLength = data[0];
    const salt = data.slice(1, 33);
    const iv = data.slice(33, 33 + ivLength);
    const encrypted = data.slice(33 + ivLength);

    const key = await CryptoUtils.deriveKey(password, salt, algorithm);

    switch (algorithm) {
      case "aes-256-gcm":
        return await CryptoUtils.decryptAES(encrypted.buffer, key, iv);
      case "chacha20-poly1305":
        // Simuler ChaCha20 avec AES pour les tests
        return await CryptoUtils.decryptAES(encrypted.buffer, key, iv);
      case "twofish":
        return await CryptoUtils.decryptTwofish(encrypted.buffer, key, iv);
      case "serpent":
        return await CryptoUtils.decryptSerpent(encrypted.buffer, key, iv);
      default:
        throw new Error(`Algorithme non supporté: ${algorithm}`);
    }
  }

  // Triple chiffrement pour mode paranoïaque
  private static async tripleEncrypt(
    data: ArrayBuffer,
    password: string,
    algorithm: string,
  ): Promise<ArrayBuffer> {
    // Premier chiffrement avec AES-256
    let encrypted = await this.singleEncrypt(data, password, algorithm);

    // Deuxième chiffrement avec un salt dérivé
    const derivedPassword = password + "_layer2";
    encrypted = await this.singleEncrypt(encrypted, derivedPassword, algorithm);

    // Troisième chiffrement avec un autre salt dérivé
    const finalPassword = password + "_layer3";
    encrypted = await this.singleEncrypt(encrypted, finalPassword, algorithm);

    return encrypted;
  }

  // Triple déchiffrement
  private static async tripleDecrypt(
    encryptedData: ArrayBuffer,
    password: string,
    algorithm: string,
  ): Promise<ArrayBuffer> {
    // Déchiffrement inverse
    const finalPassword = password + "_layer3";
    let decrypted = await this.singleDecrypt(
      encryptedData,
      finalPassword,
      algorithm,
    );

    const derivedPassword = password + "_layer2";
    decrypted = await this.singleDecrypt(decrypted, derivedPassword, algorithm);

    decrypted = await this.singleDecrypt(decrypted, password, algorithm);

    return decrypted;
  }
}
