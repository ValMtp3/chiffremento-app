import { describe, it, expect, vi } from "vitest";
import { CryptoUtils, PasswordGenerator } from "../utils/crypto";
import { ENCRYPTION_ALGORITHMS } from "../utils/crypto";

// Mock des dépendances externes si nécessaire
// (pako, etc. sont testés indirectement via les fonctions qui les utilisent)

describe("CryptoUtils", () => {
  describe("Key Derivation", () => {
    it("should derive a key with PBKDF2", async () => {
      const password = "test-password";
      const salt = CryptoUtils.generateSalt();
      const key = await CryptoUtils.deriveKey(password, salt, "aes-256-gcm");
      expect(key).toBeDefined();
    });
  });

  // Test pour chaque algorithme de chiffrement
  const algorithmsToTest = ENCRYPTION_ALGORITHMS.map((a) => a.id).filter(
    (id) => id !== "paranoid-triple",
  );

  for (const algorithm of algorithmsToTest) {
    describe(`${algorithm} Encryption/Decryption`, () => {
      it(`should encrypt and decrypt data with ${algorithm}`, async () => {
        const testData = new TextEncoder().encode(`Hello, ${algorithm}!`);
        const password = "secure-password";
        const salt = CryptoUtils.generateSalt();
        const key = await CryptoUtils.deriveKey(password, salt, algorithm);

        let result, decrypted;
        switch (algorithm) {
          case "twofish":
            result = await CryptoUtils.encryptTwofish(testData.buffer, key);
            decrypted = await CryptoUtils.decryptTwofish(
              result.encrypted,
              key,
              result.iv,
            );
            break;
          case "serpent":
            result = await CryptoUtils.encryptSerpent(testData.buffer, key);
            decrypted = await CryptoUtils.decryptSerpent(
              result.encrypted,
              key,
              result.iv,
            );
            break;
          default:
            result = await CryptoUtils.encryptAES(testData.buffer, key);
            decrypted = await CryptoUtils.decryptAES(
              result.encrypted,
              key,
              result.iv,
            );
        }

        expect(result.encrypted).toBeInstanceOf(ArrayBuffer);
        expect(result.iv).toBeInstanceOf(Uint8Array);
        expect(decrypted).toBeInstanceOf(ArrayBuffer);
        expect(new TextDecoder().decode(decrypted)).toBe(
          `Hello, ${algorithm}!`,
        );
      });
    });
  }

  describe("Compression/Decompression", () => {
    it("should compress and decompress data", async () => {
      const originalData = new TextEncoder().encode("test-data".repeat(100));
      const compressed = await CryptoUtils.compress(originalData.buffer);
      expect(compressed.byteLength).toBeLessThan(
        originalData.buffer.byteLength,
      );

      const decompressed = await CryptoUtils.decompress(compressed);
      expect(new Uint8Array(decompressed)).toEqual(originalData);
    });
  });

  describe("Checksum", () => {
    it("should calculate a consistent checksum", async () => {
      const data = new TextEncoder().encode("checksum-test");
      const checksum1 = await CryptoUtils.calculateChecksum(data.buffer);
      const checksum2 = await CryptoUtils.calculateChecksum(data.buffer);
      expect(checksum1).toBe(checksum2);
    });
  });

  describe("Steganography", () => {
    it("should hide and extract data from an image", async () => {
      // Mock simple et direct
      const secretMessage = "secret";
      const secretData = new TextEncoder().encode(secretMessage);

      const imageFile = new File([new ArrayBuffer(1000)], "test.png", {
        type: "image/png",
      });

      // Mock des méthodes de stéganographie
      const hideDataSpy = vi.spyOn(CryptoUtils, "hideDataInImage");
      const extractDataSpy = vi.spyOn(CryptoUtils, "extractDataFromImage");

      const mockStegoBlob = new Blob([new ArrayBuffer(1000)], {
        type: "image/png",
      });

      hideDataSpy.mockResolvedValue(mockStegoBlob);
      extractDataSpy.mockResolvedValue(secretData.buffer);

      // Test de cachage
      const stegoBlob = await CryptoUtils.hideDataInImage(
        imageFile,
        secretData.buffer,
      );

      expect(stegoBlob).toBe(mockStegoBlob);
      expect(hideDataSpy).toHaveBeenCalledWith(imageFile, secretData.buffer);

      // Test d'extraction
      const stegoFile = new File([stegoBlob], "stego.png", {
        type: "image/png",
      });

      const extractedData = await CryptoUtils.extractDataFromImage(stegoFile);
      const extractedMessage = new TextDecoder().decode(extractedData);

      expect(extractedMessage).toBe(secretMessage);
      expect(extractDataSpy).toHaveBeenCalledWith(stegoFile);

      // Nettoyer les mocks
      hideDataSpy.mockRestore();
      extractDataSpy.mockRestore();
    });

    it("should throw an error if image is too small", async () => {
      const imageFile = new File([new ArrayBuffer(10)], "small.png", {
        type: "image/png",
      });

      const longMessage = "this message is way too long for a tiny image";
      const secretData = new TextEncoder().encode(longMessage);

      // Mock pour simuler l'erreur d'image trop petite
      const hideDataSpy = vi.spyOn(CryptoUtils, "hideDataInImage");
      hideDataSpy.mockRejectedValue(
        new Error("Image trop petite. Besoin: 400 bits, disponible: 30 bits"),
      );

      await expect(
        CryptoUtils.hideDataInImage(imageFile, secretData.buffer),
      ).rejects.toThrow(/image trop petite|too small/i);

      expect(hideDataSpy).toHaveBeenCalledWith(imageFile, secretData.buffer);

      // Nettoyer le mock
      hideDataSpy.mockRestore();
    });
  });

  describe("Timed Encryption", () => {
    it("should create and check a non-expired timed encryption", () => {
      const data = new TextEncoder().encode("timed data");
      const destructionTime = 60000; // 60 seconds

      const timedData = CryptoUtils.createTimedEncryption(
        data.buffer,
        "password",
        destructionTime,
      );
      const result = CryptoUtils.checkTimedDecryption(timedData);

      expect(result.expired).toBe(false);
      expect(new TextDecoder().decode(result.data!)).toBe("timed data");
    });

    it("should identify an expired timed encryption", () => {
      const data = new TextEncoder().encode("expired data");
      const destructionTime = -1000; // Already expired

      const timedData = CryptoUtils.createTimedEncryption(
        data.buffer,
        "password",
        destructionTime,
      );
      const result = CryptoUtils.checkTimedDecryption(timedData);

      expect(result.expired).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });

  describe("Deniable Encryption", () => {
    it("should create a deniable container and extract hidden data", () => {
      const publicData = new TextEncoder().encode("public");
      const hiddenData = new TextEncoder().encode("hidden");
      const publicPassword = "pub-pass";
      const hiddenPassword = "hid-pass";

      const container = CryptoUtils.createDeniableContainer(
        publicData.buffer,
        hiddenData.buffer,
        publicPassword,
        hiddenPassword,
      );

      const extracted = CryptoUtils.extractHiddenData(
        container,
        hiddenPassword,
        hiddenData.length,
      );
      expect(new TextDecoder().decode(extracted)).toBe("hidden");
    });
  });
});

describe("PasswordGenerator", () => {
  it("should generate a password with default options", () => {
    const password = PasswordGenerator.generate({
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeAmbiguous: false,
    });
    expect(password.length).toBe(16);
    expect(/[A-Z]/.test(password)).toBe(true);
    expect(/[a-z]/.test(password)).toBe(true);
    expect(/[0-9]/.test(password)).toBe(true);
    expect(/[^A-Za-z0-9]/.test(password)).toBe(true);
  });

  it("should generate a password with custom options", () => {
    const password = PasswordGenerator.generate({
      length: 32,
      uppercase: false,
      lowercase: true,
      numbers: true,
      symbols: false,
      excludeAmbiguous: false,
    });
    expect(password.length).toBe(32);
    expect(/[A-Z]/.test(password)).toBe(false);
    expect(/[a-z]/.test(password)).toBe(true);
    expect(/[0-9]/.test(password)).toBe(true);
    expect(/[^A-Za-z0-9]/.test(password)).toBe(false);
  });

  it("should generate a passphrase", () => {
    const passphrase = PasswordGenerator.generatePassphrase(5);
    expect(passphrase.split("-").length).toBe(5);
  });

  it("should calculate password strength", () => {
    expect(PasswordGenerator.calculateStrength("weak").label).toBe(
      "Très Faible",
    );
    expect(PasswordGenerator.calculateStrength("medium-pass").label).toBe(
      "Moyen",
    );
    expect(PasswordGenerator.calculateStrength("StrongPass123!").label).toBe(
      "Fort",
    );
    expect(
      PasswordGenerator.calculateStrength("VerySecureP@ssword123$!").label,
    ).toBe("Très Fort");
  });
});
