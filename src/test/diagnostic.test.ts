import { describe, it, expect, beforeEach } from "vitest";
import { FileEncryptionService } from "../utils/fileEncryption";
import { CryptoUtils, PasswordGenerator } from "../utils/crypto";
import type { EncryptionOptions } from "../types/crypto";

// Fonction helper pour créer un fichier mock
function createMockFile(content: string, filename = "test.txt"): File {
  const blob = new Blob([content], { type: "text/plain" });
  return new File([blob], filename, { type: "text/plain" });
}

describe("Tests de Diagnostic Chiffremento", () => {
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

  describe("🔍 Diagnostic Mode Paranoïaque", () => {
    it("devrait identifier le problème de déchiffrement paranoïaque", async () => {
      const content = "Test paranoïaque";
      const file = createMockFile(content);
      const options = { ...defaultOptions, paranoidMode: true };

      console.log("🧪 Test Mode Paranoïaque");
      console.log("📝 Contenu original:", content);
      console.log("🔧 Options:", JSON.stringify(options, null, 2));

      try {
        // Étape 1: Chiffrement
        console.log("🔐 Étape 1: Chiffrement...");
        const encrypted = await FileEncryptionService.encryptFile(file, options);
        console.log("✅ Chiffrement réussi");
        console.log("📊 Métadonnées:", JSON.stringify(encrypted.metadata, null, 2));
        console.log("🏷️ Algorithme stocké:", encrypted.metadata.algorithm);
        console.log("🎯 Mode paranoïaque:", encrypted.metadata.paranoidMode);

        // Étape 2: Déchiffrement
        console.log("🔓 Étape 2: Déchiffrement...");
        const decrypted = await FileEncryptionService.decryptFile(
          encrypted,
          options.password
        );
        console.log("✅ Déchiffrement réussi");
        console.log("📄 Contenu déchiffré:", new TextDecoder().decode(decrypted.data));

        expect(new TextDecoder().decode(decrypted.data)).toBe(content);
      } catch (error) {
        console.log("❌ Erreur capturée:", error.message);
        console.log("🔍 Stack trace:", error.stack);
        throw error;
      }
    });
  });

  describe("🔐 Diagnostic Validation Mot de Passe", () => {
    it("devrait révéler pourquoi les mauvais mots de passe passent", async () => {
      const content = "Test validation";
      const file = createMockFile(content);
      const correctPassword = "correct-password";
      const wrongPassword = "wrong-password";

      console.log("🧪 Test Validation Mot de Passe");
      console.log("✅ Bon mot de passe:", correctPassword);
      console.log("❌ Mauvais mot de passe:", wrongPassword);

      // Chiffrement avec le bon mot de passe
      const options = { ...defaultOptions, password: correctPassword };
      const encrypted = await FileEncryptionService.encryptFile(file, options);
      console.log("🔐 Chiffrement effectué avec:", correctPassword);
      console.log("🏁 Checksum:", encrypted.metadata.checksum);

      try {
        // Tentative de déchiffrement avec le mauvais mot de passe
        console.log("🔓 Tentative avec mauvais mot de passe...");
        const decrypted = await FileEncryptionService.decryptFile(
          encrypted,
          wrongPassword
        );
        console.log("⚠️ PROBLÈME: Déchiffrement 'réussi' avec mauvais mot de passe!");
        console.log("📄 Contenu 'déchiffré':", new TextDecoder().decode(decrypted.data));
        console.log("📏 Taille données:", decrypted.data.byteLength);

        // Ce test devrait échouer si la sécurité fonctionne
        expect.fail("Le déchiffrement avec un mauvais mot de passe devrait échouer");
      } catch (error) {
        console.log("✅ SÉCURITÉ OK: Erreur attendue:", error.message);
        expect(error.message).toContain("déchiffrement");
      }
    });
  });

  describe("🗜️ Diagnostic Compression", () => {
    it("devrait identifier le problème de compression", async () => {
      const content = "Données à compresser ".repeat(50);
      const originalData = new TextEncoder().encode(content);

      console.log("🧪 Test Compression");
      console.log("📏 Taille originale:", originalData.length, "octets");
      console.log("📝 Échantillon:", content.substring(0, 50) + "...");

      try {
        console.log("🗜️ Compression en cours...");
        const compressed = await CryptoUtils.compress(originalData.buffer);
        console.log("📦 Taille compressée:", compressed.byteLength, "octets");
        console.log("📊 Ratio:", ((compressed.byteLength / originalData.length) * 100).toFixed(1) + "%");

        if (compressed.byteLength === 0) {
          console.log("❌ PROBLÈME: Compression a produit 0 octets");
          throw new Error("Compression produit des données vides");
        }

        console.log("🔄 Décompression en cours...");
        const decompressed = await CryptoUtils.decompress(compressed);
        console.log("📏 Taille décompressée:", decompressed.byteLength, "octets");

        if (decompressed.byteLength === 0) {
          console.log("❌ PROBLÈME: Décompression a produit 0 octets");
          throw new Error("Décompression produit des données vides");
        }

        const decompressedText = new TextDecoder().decode(decompressed);
        console.log("📝 Échantillon décompressé:", decompressedText.substring(0, 50) + "...");
        console.log("✅ Match avec original:", decompressedText === content ? "OUI" : "NON");

        expect(decompressedText).toBe(content);
      } catch (error) {
        console.log("❌ Erreur compression:", error.message);
        console.log("🔍 Stack:", error.stack);
        throw error;
      }
    });
  });

  describe("🔍 Diagnostic Détection Corruption", () => {
    it("devrait révéler pourquoi la corruption n'est pas détectée", async () => {
      const content = "Données à protéger";
      const file = createMockFile(content);

      console.log("🧪 Test Détection Corruption");
      console.log("📝 Contenu original:", content);

      // Chiffrement normal
      const encrypted = await FileEncryptionService.encryptFile(file, defaultOptions);
      console.log("🔐 Chiffrement effectué");
      console.log("🏁 Checksum original:", encrypted.metadata.checksum);
      console.log("📏 Taille données chiffrées:", encrypted.encryptedData.byteLength);

      // Corruption des données
      const corruptedData = new Uint8Array(encrypted.encryptedData);
      const originalByte = corruptedData[10];
      corruptedData[10] = corruptedData[10] ^ 0xFF; // Flipper tous les bits
      console.log("💥 Corruption appliquée à l'octet 10:");
      console.log("   Avant:", originalByte.toString(16).padStart(2, '0'));
      console.log("   Après:", corruptedData[10].toString(16).padStart(2, '0'));

      encrypted.encryptedData = corruptedData.buffer;

      try {
        console.log("🔓 Tentative de déchiffrement des données corrompues...");
        const decrypted = await FileEncryptionService.decryptFile(
          encrypted,
          defaultOptions.password
        );

        console.log("⚠️ PROBLÈME: Déchiffrement 'réussi' avec données corrompues!");
        console.log("📄 Contenu 'déchiffré':", new TextDecoder().decode(decrypted.data));
        console.log("✅ Match avec original:", new TextDecoder().decode(decrypted.data) === content ? "OUI" : "NON");

        // Ce test devrait échouer si la détection de corruption fonctionne
        expect.fail("Le déchiffrement de données corrompues devrait échouer");
      } catch (error) {
        console.log("✅ SÉCURITÉ OK: Corruption détectée:", error.message);
        expect(error.message).toMatch(/corrompu|invalide|corruption/i);
      }
    });
  });

  describe("⚙️ Diagnostic Métadonnées", () => {
    it("devrait analyser la structure des métadonnées", async () => {
      const content = "Test métadonnées";
      const file = createMockFile(content);

      console.log("🧪 Analyse des Métadonnées");

      // Test avec différentes configurations
      const configs = [
        { name: "Standard", options: { ...defaultOptions } },
        { name: "Compressé", options: { ...defaultOptions, compress: true } },
        { name: "Fragmenté", options: { ...defaultOptions, fragment: true, fragmentSize: 100 } },
        { name: "Paranoïaque", options: { ...defaultOptions, paranoidMode: true } },
      ];

      for (const config of configs) {
        console.log(`\n📋 Configuration: ${config.name}`);
        try {
          const encrypted = await FileEncryptionService.encryptFile(file, config.options);
          console.log("   📊 Métadonnées:", JSON.stringify(encrypted.metadata, null, 4));
          console.log("   🏷️ Algorithme:", encrypted.metadata.algorithm);
          console.log("   📦 Compressé:", encrypted.metadata.compressed || false);
          console.log("   🧩 Fragmenté:", encrypted.metadata.fragmented || false);
          console.log("   🛡️ Paranoïaque:", encrypted.metadata.paranoidMode || false);
          console.log("   📏 Taille données:", encrypted.encryptedData.byteLength);
        } catch (error) {
          console.log("   ❌ Erreur:", error.message);
        }
      }
    });
  });

  describe("🎲 Diagnostic Générateur Mots de Passe", () => {
    it("devrait analyser la génération de mots de passe", () => {
      console.log("🧪 Test Générateur de Mots de Passe");

      // Test avec différentes options
      const testOptions = [
        { length: 8, uppercase: true, lowercase: true, numbers: true, symbols: false, excludeAmbiguous: true },
        { length: 16, uppercase: false, lowercase: true, numbers: true, symbols: true, excludeAmbiguous: false },
        { length: 32, uppercase: true, lowercase: true, numbers: true, symbols: true, excludeAmbiguous: true },
      ];

      testOptions.forEach((options, index) => {
        console.log(`\n🔧 Configuration ${index + 1}:`, JSON.stringify(options, null, 2));

        try {
          const password = PasswordGenerator.generate(options);
          console.log("🔑 Mot de passe généré:", password);
          console.log("📏 Longueur:", password.length);
          console.log("🔍 Analyse:");
          console.log("   - Majuscules:", /[A-Z]/.test(password) ? "✅" : "❌");
          console.log("   - Minuscules:", /[a-z]/.test(password) ? "✅" : "❌");
          console.log("   - Chiffres:", /[0-9]/.test(password) ? "✅" : "❌");
          console.log("   - Symboles:", /[^A-Za-z0-9]/.test(password) ? "✅" : "❌");

          const strength = PasswordGenerator.calculateStrength(password);
          console.log("💪 Force:", strength.label, `(${strength.score}/10)`);
          console.log("🔢 Entropie:", strength.entropy.toFixed(1), "bits");
        } catch (error) {
          console.log("❌ Erreur:", error.message);
        }
      });

      // Test phrase secrète
      console.log("\n🔤 Test Phrase Secrète:");
      try {
        const passphrase = PasswordGenerator.generatePassphrase(5);
        console.log("📝 Phrase générée:", passphrase);
        console.log("🔢 Nombre de mots:", passphrase.split("-").length);

        const strength = PasswordGenerator.calculateStrength(passphrase);
        console.log("💪 Force:", strength.label, `(${strength.score}/10)`);
      } catch (error) {
        console.log("❌ Erreur phrase secrète:", error.message);
      }
    });
  });
});
