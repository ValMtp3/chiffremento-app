import { describe, it, expect, beforeEach, vi } from "vitest";
import { FileEncryptionService } from "../utils/fileEncryption";
import { CryptoUtils, PasswordGenerator } from "../utils/crypto";
import type { EncryptionOptions } from "../types/crypto";

// Fonction helper pour créer un fichier mock
function createMockFile(content: string, filename = "test.txt"): File {
  const blob = new Blob([content], { type: "text/plain" });
  return new File([blob], filename, { type: "text/plain" });
}

describe("Tests d'Intégration Chiffremento", () => {
  let defaultOptions: EncryptionOptions;

  beforeEach(() => {
    defaultOptions = {
      algorithm: "aes-256-gcm",
      password: "test-password-123",
      compress: false,
      fragment: false,
      fragmentSize: 10 * 1024 * 1024,
      paranoidMode: false,
      addTimestamp: true,
    };
  });

  describe("Chiffrement/Déchiffrement de Base", () => {
    it("devrait chiffrer et déchiffrer un fichier simple", async () => {
      const content = "Contenu de test pour le chiffrement";
      const file = createMockFile(content);

      // Chiffrement
      const encrypted = await FileEncryptionService.encryptFile(
        file,
        defaultOptions,
      );
      expect(encrypted).toBeDefined();
      expect(encrypted.originalName).toBe("test.txt");
      expect(encrypted.metadata.algorithm).toBe("aes-256-gcm");

      // Déchiffrement
      const decrypted = await FileEncryptionService.decryptFile(
        encrypted,
        defaultOptions.password,
      );
      expect(decrypted).toBeDefined();
      expect(decrypted.name).toBe("test.txt");
      expect(new TextDecoder().decode(decrypted.data)).toBe(content);
    });

    it("devrait échouer avec un mauvais mot de passe", async () => {
      const file = createMockFile("test content");
      const encrypted = await FileEncryptionService.encryptFile(
        file,
        defaultOptions,
      );

      await expect(
        FileEncryptionService.decryptFile(encrypted, "wrong-password"),
      ).rejects.toThrow();
    });
  });

  describe("Tests des Algorithmes", () => {
    const algorithms = [
      "aes-256-gcm",
      "chacha20-poly1305",
      "twofish",
      "serpent",
    ];

    for (const algorithm of algorithms) {
      it(`devrait fonctionner avec ${algorithm}`, async () => {
        const content = `Test avec ${algorithm}`;
        const file = createMockFile(content);
        const options = { ...defaultOptions, algorithm };

        const encrypted = await FileEncryptionService.encryptFile(
          file,
          options,
        );
        const decrypted = await FileEncryptionService.decryptFile(
          encrypted,
          options.password,
        );

        expect(new TextDecoder().decode(decrypted.data)).toBe(content);
      });
    }
  });

  describe("Mode Paranoïaque", () => {
    it("devrait utiliser le triple chiffrement", async () => {
      const content = "Contenu ultra secret";
      const file = createMockFile(content);
      const options = { ...defaultOptions, paranoidMode: true };

      const encrypted = await FileEncryptionService.encryptFile(file, options);
      expect(encrypted.metadata.algorithm).toBe("paranoid-triple");
      expect(encrypted.metadata.paranoidMode).toBe(true);

      const decrypted = await FileEncryptionService.decryptFile(
        encrypted,
        options.password,
      );
      expect(new TextDecoder().decode(decrypted.data)).toBe(content);
    });
  });

  describe("Compression", () => {
    it("devrait compresser et décompresser les données", async () => {
      const content = "Données répétitives ".repeat(100);
      const file = createMockFile(content);
      const options = { ...defaultOptions, compress: true };

      const encrypted = await FileEncryptionService.encryptFile(file, options);
      expect(encrypted.metadata.compressed).toBe(true);

      const decrypted = await FileEncryptionService.decryptFile(
        encrypted,
        options.password,
      );
      expect(new TextDecoder().decode(decrypted.data)).toBe(content);
    });
  });

  describe("Fragmentation", () => {
    it("devrait fragmenter les gros fichiers", async () => {
      const content = "x".repeat(50000); // 50KB
      const file = createMockFile(content);
      const options = {
        ...defaultOptions,
        fragment: true,
        fragmentSize: 10000, // 10KB
      };

      const encrypted = await FileEncryptionService.encryptFile(file, options);
      expect(encrypted.metadata.fragmented).toBe(true);
      expect(encrypted.metadata.fragments).toBeGreaterThan(1);

      const decrypted = await FileEncryptionService.decryptFile(
        encrypted,
        options.password,
      );
      expect(new TextDecoder().decode(decrypted.data)).toBe(content);
    });
  });

  describe("Générateur de Mots de Passe", () => {
    it("devrait générer un mot de passe avec options par défaut", () => {
      const password = PasswordGenerator.generate({
        length: 16,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
        excludeAmbiguous: true,
      });

      expect(password).toBeDefined();
      expect(password.length).toBe(16);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
    });

    it("devrait générer une phrase secrète", () => {
      const passphrase = PasswordGenerator.generatePassphrase(4);
      expect(passphrase).toBeDefined();
      expect(passphrase.split("-").length).toBe(4);
    });

    it("devrait calculer la force d'un mot de passe", () => {
      const weakPassword = "123";
      const strongPassword = "MyStr0ng-P@ssw0rd!";

      const weakStrength = PasswordGenerator.calculateStrength(weakPassword);
      const strongStrength =
        PasswordGenerator.calculateStrength(strongPassword);

      expect(weakStrength.score).toBeLessThan(strongStrength.score);
      expect(strongStrength.entropy).toBeGreaterThan(weakStrength.entropy);
    });
  });

  describe("Utilitaires Cryptographiques", () => {
    it("devrait générer des sels aléatoires", () => {
      const salt1 = CryptoUtils.generateSalt();
      const salt2 = CryptoUtils.generateSalt();

      expect(salt1).toHaveLength(32);
      expect(salt2).toHaveLength(32);
      expect(salt1).not.toEqual(salt2);
    });

    it("devrait calculer des checksums cohérents", async () => {
      const data = new TextEncoder().encode("test data");
      const checksum1 = await CryptoUtils.calculateChecksum(data.buffer);
      const checksum2 = await CryptoUtils.calculateChecksum(data.buffer);

      expect(checksum1).toBe(checksum2);
      expect(typeof checksum1).toBe("string");
      expect(checksum1.length).toBe(64); // SHA-256
    });

    it("devrait compresser et décompresser les données", async () => {
      const originalData = new TextEncoder().encode(
        "data to compress ".repeat(50),
      );

      const compressed = await CryptoUtils.compress(originalData.buffer);
      const decompressed = await CryptoUtils.decompress(compressed);

      expect(new Uint8Array(decompressed)).toEqual(originalData);
    });
  });

  describe("Chiffrement Temporisé", () => {
    it("devrait créer un chiffrement temporisé non expiré", () => {
      const data = new TextEncoder().encode("temporary data");
      const futureTime = 60000; // 60 secondes

      const timedData = CryptoUtils.createTimedEncryption(
        data.buffer,
        "password",
        futureTime,
      );

      const result = CryptoUtils.checkTimedDecryption(timedData);
      expect(result.expired).toBe(false);
      expect(result.data).toBeDefined();
    });

    it("devrait détecter un chiffrement expiré", () => {
      const data = new TextEncoder().encode("expired data");
      const pastTime = -1000; // Déjà expiré

      const timedData = CryptoUtils.createTimedEncryption(
        data.buffer,
        "password",
        pastTime,
      );

      const result = CryptoUtils.checkTimedDecryption(timedData);
      expect(result.expired).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });

  describe("Conteneur Déniable", () => {
    it("devrait créer et extraire des données cachées", () => {
      const publicData = new TextEncoder().encode("données publiques");
      const hiddenData = new TextEncoder().encode("données secrètes");

      const container = CryptoUtils.createDeniableContainer(
        publicData.buffer,
        hiddenData.buffer,
        "public-pass",
        "hidden-pass",
      );

      const extracted = CryptoUtils.extractHiddenData(
        container,
        "hidden-pass",
        hiddenData.length,
      );

      expect(new TextDecoder().decode(extracted)).toBe("données secrètes");
    });
  });

  describe("Test de Performance", () => {
    it("devrait traiter un fichier de taille moyenne rapidement", async () => {
      const content = "x".repeat(100000); // 100KB
      const file = createMockFile(content);

      const startTime = performance.now();
      const encrypted = await FileEncryptionService.encryptFile(
        file,
        defaultOptions,
      );
      const decrypted = await FileEncryptionService.decryptFile(
        encrypted,
        defaultOptions.password,
      );
      const endTime = performance.now();

      expect(new TextDecoder().decode(decrypted.data)).toBe(content);
      expect(endTime - startTime).toBeLessThan(5000); // Moins de 5 secondes
    });
  });

  describe("Gestion des Erreurs", () => {
    it("devrait rejeter un mot de passe vide", async () => {
      const file = createMockFile("test");
      const options = { ...defaultOptions, password: "" };

      await expect(
        FileEncryptionService.encryptFile(file, options),
      ).rejects.toThrow("Mot de passe requis");
    });

    it("devrait rejeter un algorithme invalide", async () => {
      const file = createMockFile("test");
      const options = { ...defaultOptions, algorithm: "invalid-algo" as any };

      await expect(
        FileEncryptionService.encryptFile(file, options),
      ).rejects.toThrow("Algorithme non supporté");
    });

    it("devrait détecter des données corrompues", async () => {
      const file = createMockFile("test");
      const encrypted = await FileEncryptionService.encryptFile(
        file,
        defaultOptions,
      );

      // Corrompre les données
      const corruptedData = new Uint8Array(encrypted.encryptedData);
      corruptedData[0] = corruptedData[0] ^ 0xff; // Flip all bits du premier byte
      encrypted.encryptedData = corruptedData.buffer;

      await expect(
        FileEncryptionService.decryptFile(encrypted, defaultOptions.password),
      ).rejects.toThrow();
    });
  });

  describe("Métadonnées", () => {
    it("devrait préserver les métadonnées du fichier", async () => {
      const file = createMockFile("test content", "important.txt");
      const encrypted = await FileEncryptionService.encryptFile(
        file,
        defaultOptions,
      );

      expect(encrypted.originalName).toBe("important.txt");
      expect(encrypted.metadata.timestamp).toBeDefined();
      expect(encrypted.metadata.checksum).toBeDefined();
      expect(encrypted.id).toBeDefined();
    });

    it("devrait inclure toutes les options dans les métadonnées", async () => {
      // Créer un fichier avec des données non-compressibles pour garantir la fragmentation
      // Utiliser des données pseudo-aléatoires qui ne se compriment pas bien
      const chunks: string[] = [];
      for (let i = 0; i < 2000; i++) {
        // Créer des données pseudo-aléatoires basées sur l'index
        const randomChunk = Array.from({ length: 6000 }, (_, j) =>
          String.fromCharCode(33 + ((i * 1000 + j * 7) % 94)),
        ).join("");
        chunks.push(randomChunk);
      }
      const largeContent = chunks.join(""); // ~12MB de données non-compressibles
      const file = createMockFile(largeContent);
      const options = {
        ...defaultOptions,
        compress: true,
        paranoidMode: true,
        fragment: true,
        fragmentSize: 5 * 1024 * 1024, // 5MB pour forcer la fragmentation
      };

      const encrypted = await FileEncryptionService.encryptFile(file, options);

      expect(encrypted.metadata.compressed).toBe(true);
      expect(encrypted.metadata.paranoidMode).toBe(true);
      expect(encrypted.metadata.fragmented).toBe(true);
    });
  });
});
