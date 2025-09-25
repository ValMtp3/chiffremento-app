import { describe, it, expect, beforeEach, vi } from "vitest";
import { FileEncryptionService } from "../utils/fileEncryption";
import { EncryptionOptions, OperationProgress } from "../types/crypto";

describe("FileEncryptionService", () => {
  let mockProgressCallback: (progress: OperationProgress) => void;
  let progressCalls: OperationProgress[];

  beforeEach(() => {
    vi.clearAllMocks();
    progressCalls = [];
    mockProgressCallback = vi.fn((progress) => {
      progressCalls.push(progress);
    });
  });

  const createMockFile = (content: string, name: string = "test.txt"): File => {
    return new File([content], name, { type: "text/plain" });
  };

  const defaultOptions: EncryptionOptions = {
    algorithm: "aes-256-gcm",
    password: "test-password",
    compress: false,
    fragment: false,
    fragmentSize: 10 * 1024 * 1024,
    paranoidMode: false,
    addTimestamp: true,
  };

  describe("encryptFile", () => {
    it("should encrypt a file with basic options", async () => {
      const file = createMockFile("Hello, World!");
      const options = { ...defaultOptions };

      const result = await FileEncryptionService.encryptFile(
        file,
        options,
        mockProgressCallback,
      );

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.originalName).toBe("test.txt");
      expect(result.encryptedData).toBeDefined();
      expect(result.metadata.algorithm).toBe("aes-256-gcm");
      expect(result.metadata.compressed).toBe(false);
      expect(result.metadata.fragmented).toBe(false);
      expect(result.metadata.checksum).toBeDefined();
    });

    it("should call progress callback during encryption", async () => {
      const file = createMockFile("Test content");
      const options = { ...defaultOptions };

      await FileEncryptionService.encryptFile(
        file,
        options,
        mockProgressCallback,
      );

      expect(mockProgressCallback).toHaveBeenCalled();
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[0].stage).toBe("reading");
      expect(progressCalls[progressCalls.length - 1].stage).toBe("complete");
      expect(progressCalls[progressCalls.length - 1].progress).toBe(100);
    });

    it("should compress file when compression is enabled", async () => {
      const file = createMockFile(
        "This is a long text that should be compressed".repeat(100),
      );
      const options = { ...defaultOptions, compress: true };

      const result = await FileEncryptionService.encryptFile(
        file,
        options,
        mockProgressCallback,
      );

      expect(result.metadata.compressed).toBe(true);
      expect(progressCalls.some((p) => p.stage === "compressing")).toBe(true);
    });

    it("should use paranoid mode with triple encryption", async () => {
      const file = createMockFile("Sensitive data");
      const options = { ...defaultOptions, paranoidMode: true };

      const result = await FileEncryptionService.encryptFile(
        file,
        options,
        mockProgressCallback,
      );

      expect(result.metadata.algorithm).toBe("paranoid-triple");
      expect(result.metadata.paranoidMode).toBe(true);
      expect(progressCalls.some((p) => p.stage === "paranoid")).toBe(true);
    });

    it("should fragment large files when fragmentation is enabled", async () => {
      const largeContent = "x".repeat(20 * 1024 * 1024); // 20MB
      const file = createMockFile(largeContent);
      const options = {
        ...defaultOptions,
        fragment: true,
        fragmentSize: 10 * 1024 * 1024, // 10MB
      };

      const result = await FileEncryptionService.encryptFile(
        file,
        options,
        mockProgressCallback,
      );

      expect(result.metadata.fragmented).toBe(true);
      expect(result.metadata.fragments).toBeGreaterThan(1);
      expect(progressCalls.some((p) => p.stage === "fragmenting")).toBe(true);
    });

    it("should not fragment small files even when fragmentation is enabled", async () => {
      const smallContent = "small file";
      const file = createMockFile(smallContent);
      const options = {
        ...defaultOptions,
        fragment: true,
        fragmentSize: 10 * 1024 * 1024,
      };

      const result = await FileEncryptionService.encryptFile(
        file,
        options,
        mockProgressCallback,
      );

      expect(result.metadata.fragmented).toBe(false);
      expect(result.metadata.fragments).toBe(1);
    });

    it("should include timestamp when addTimestamp is true", async () => {
      const file = createMockFile("Timestamped content");
      const options = { ...defaultOptions, addTimestamp: true };

      const beforeTime = Date.now();
      const result = await FileEncryptionService.encryptFile(
        file,
        options,
        mockProgressCallback,
      );
      const afterTime = Date.now();

      expect(result.metadata.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.metadata.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it("should handle different encryption algorithms", async () => {
      const file = createMockFile("Algorithm test");

      for (const algorithm of [
        "aes-256-gcm",
        "chacha20-poly1305",
        "twofish",
        "serpent",
      ]) {
        const options = { ...defaultOptions, algorithm };

        const result = await FileEncryptionService.encryptFile(
          file,
          options,
          mockProgressCallback,
        );

        expect(result.metadata.algorithm).toBe(algorithm);
      }
    });

    it("should throw error for invalid options", async () => {
      const file = createMockFile("Test content");
      const invalidOptions = { ...defaultOptions, password: "" };

      await expect(
        FileEncryptionService.encryptFile(
          file,
          invalidOptions,
          mockProgressCallback,
        ),
      ).rejects.toThrow();
    });
  });

  describe("decryptFile", () => {
    it("should decrypt a previously encrypted file", async () => {
      const originalContent = "Hello, Decryption!";
      const file = createMockFile(originalContent);
      const options = { ...defaultOptions };

      // First encrypt
      const encryptedResult = await FileEncryptionService.encryptFile(
        file,
        options,
        mockProgressCallback,
      );

      // Then decrypt
      const decryptedResult = await FileEncryptionService.decryptFile(
        encryptedResult,
        options.password,
        mockProgressCallback,
      );

      expect(decryptedResult).toBeDefined();
      expect(decryptedResult.name).toBe("test.txt");
      expect(decryptedResult.data).toBeDefined();
    });

    it("should call progress callback during decryption", async () => {
      const file = createMockFile("Decrypt progress test");
      const options = { ...defaultOptions };

      const encryptedResult = await FileEncryptionService.encryptFile(
        file,
        options,
      );

      // Clear previous progress calls
      progressCalls.length = 0;

      await FileEncryptionService.decryptFile(
        encryptedResult,
        options.password,
        mockProgressCallback,
      );

      expect(mockProgressCallback).toHaveBeenCalled();
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[0].stage).toBe("reading");
      expect(progressCalls[progressCalls.length - 1].stage).toBe("complete");
    });

    it("should verify checksum during decryption", async () => {
      const file = createMockFile("Checksum verification test");
      const options = { ...defaultOptions };

      const encryptedResult = await FileEncryptionService.encryptFile(
        file,
        options,
      );

      // Corrupt the checksum
      encryptedResult.metadata.checksum = "invalid-checksum";

      await expect(
        FileEncryptionService.decryptFile(
          encryptedResult,
          options.password,
          mockProgressCallback,
        ),
      ).rejects.toThrow("Fichier corrompu - Checksum invalide");
    });

    it("should handle compressed files during decryption", async () => {
      const file = createMockFile("Compression test content".repeat(50));
      const options = { ...defaultOptions, compress: true };

      const encryptedResult = await FileEncryptionService.encryptFile(
        file,
        options,
      );

      const decryptedResult = await FileEncryptionService.decryptFile(
        encryptedResult,
        options.password,
        mockProgressCallback,
      );

      expect(decryptedResult).toBeDefined();
      expect(progressCalls.some((p) => p.stage === "decompressing")).toBe(true);
    });

    it("should handle paranoid mode decryption", async () => {
      const file = createMockFile("Paranoid mode test");
      const options = { ...defaultOptions, paranoidMode: true };

      const encryptedResult = await FileEncryptionService.encryptFile(
        file,
        options,
      );

      // Update metadata to reflect paranoid mode
      encryptedResult.metadata.algorithm = "paranoid-triple";

      const decryptedResult = await FileEncryptionService.decryptFile(
        encryptedResult,
        options.password,
        mockProgressCallback,
      );

      expect(decryptedResult).toBeDefined();
      expect(
        progressCalls.some(
          (p) => p.stage === "decrypting" && p.message.includes("triple"),
        ),
      ).toBe(true);
    });

    it("should throw error with wrong password", async () => {
      const file = createMockFile("Password protection test");
      const options = { ...defaultOptions };

      const encryptedResult = await FileEncryptionService.encryptFile(
        file,
        options,
      );

      await expect(
        FileEncryptionService.decryptFile(
          encryptedResult,
          "wrong-password",
          mockProgressCallback,
        ),
      ).rejects.toThrow();
    });

    it("should handle different algorithms during decryption", async () => {
      const file = createMockFile("Algorithm decryption test");

      for (const algorithm of [
        "aes-256-gcm",
        "chacha20-poly1305",
        "twofish",
        "serpent",
      ]) {
        const options = { ...defaultOptions, algorithm };

        const encryptedResult = await FileEncryptionService.encryptFile(
          file,
          options,
        );

        const decryptedResult = await FileEncryptionService.decryptFile(
          encryptedResult,
          options.password,
          mockProgressCallback,
        );

        expect(decryptedResult).toBeDefined();
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle file reading errors gracefully", async () => {
      // Create a file that will cause reading errors
      const mockFile = {
        name: "error.txt",
        size: 1000,
        arrayBuffer: vi.fn().mockRejectedValue(new Error("Read error")),
      } as unknown as File;

      const options = { ...defaultOptions };

      await expect(
        FileEncryptionService.encryptFile(
          mockFile,
          options,
          mockProgressCallback,
        ),
      ).rejects.toThrow("Erreur lors du chiffrement");
    });

    it("should handle encryption errors", async () => {
      const file = createMockFile("Encryption error test");
      const options = {
        ...defaultOptions,
        algorithm: "invalid-algorithm" as any,
      };

      await expect(
        FileEncryptionService.encryptFile(file, options, mockProgressCallback),
      ).rejects.toThrow();
    });

    it("should handle corrupted encrypted data", async () => {
      const file = createMockFile("Corruption test");
      const options = { ...defaultOptions };

      const encryptedResult = await FileEncryptionService.encryptFile(
        file,
        options,
      );

      // Corrupt the encrypted data
      const corruptedData = new Uint8Array(encryptedResult.encryptedData);
      corruptedData[0] = corruptedData[0] ^ 0xff;
      encryptedResult.encryptedData = corruptedData.buffer;

      await expect(
        FileEncryptionService.decryptFile(
          encryptedResult,
          options.password,
          mockProgressCallback,
        ),
      ).rejects.toThrow();
    });
  });

  describe("Progress Reporting", () => {
    it("should report progress in logical order", async () => {
      const file = createMockFile("Progress order test");
      const options = { ...defaultOptions, compress: true };

      await FileEncryptionService.encryptFile(
        file,
        options,
        mockProgressCallback,
      );

      const stages = progressCalls.map((p) => p.stage);
      const uniqueStages = [...new Set(stages)];

      expect(uniqueStages).toContain("reading");
      expect(uniqueStages).toContain("compressing");
      expect(uniqueStages).toContain("encrypting");
      expect(uniqueStages).toContain("finalizing");
      expect(uniqueStages).toContain("complete");

      // Check that progress values are non-decreasing
      for (let i = 1; i < progressCalls.length; i++) {
        expect(progressCalls[i].progress).toBeGreaterThanOrEqual(
          progressCalls[i - 1].progress,
        );
      }
    });

    it("should handle progress callback errors gracefully", async () => {
      const file = createMockFile("Progress error test");
      const options = { ...defaultOptions };
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error("Progress callback error");
      });

      // Should not throw even if progress callback throws
      const result = await FileEncryptionService.encryptFile(
        file,
        options,
        errorCallback,
      );

      expect(result).toBeDefined();
    });
  });

  describe("Metadata Validation", () => {
    it("should create valid metadata for encrypted files", async () => {
      const file = createMockFile("Metadata test");
      const options = {
        ...defaultOptions,
        compress: true,
        fragment: true,
        addTimestamp: true,
      };

      const result = await FileEncryptionService.encryptFile(
        file,
        options,
        mockProgressCallback,
      );

      const metadata = result.metadata;
      expect(metadata.algorithm).toBe(options.algorithm);
      expect(metadata.timestamp).toBeGreaterThan(0);
      expect(metadata.compressed).toBe(true);
      expect(metadata.fragmented).toBeDefined();
      expect(metadata.checksum).toBeDefined();
      expect(typeof metadata.checksum).toBe("string");
      expect(metadata.checksum.length).toBeGreaterThan(0);
    });

    it("should preserve original filename", async () => {
      const filename = "important-document.pdf";
      const file = createMockFile("PDF content", filename);
      const options = { ...defaultOptions };

      const result = await FileEncryptionService.encryptFile(
        file,
        options,
        mockProgressCallback,
      );

      expect(result.originalName).toBe(filename);
    });
  });
});
