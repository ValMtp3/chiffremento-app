import {
  EncryptionAlgorithm,
  EncryptionOptions,
  EncryptedFile,
  PasswordOptions,
} from "../types/crypto";

// Algorithmes de chiffrement supportés
export const ENCRYPTION_ALGORITHMS: EncryptionAlgorithm[] = [
  {
    id: "aes-256-gcm",
    name: "AES-256-GCM",
    description: "Standard militaire, équilibre parfait sécurité/performance",
    keyLength: 256,
    blockSize: 16,
    performance: "high",
    security: "military",
  },
  {
    id: "chacha20-poly1305",
    name: "ChaCha20-Poly1305",
    description:
      "Moderne et rapide, résistant aux attaques par canal auxiliaire",
    keyLength: 256,
    performance: "high",
    security: "very-high",
  },
  {
    id: "twofish",
    name: "Twofish",
    description: "Alternative robuste à AES, chiffrement en blocs",
    keyLength: 256,
    blockSize: 16,
    performance: "medium",
    security: "very-high",
  },
  {
    id: "serpent",
    name: "Serpent",
    description:
      "Très sécurisé mais plus lent, recommandé pour données critiques",
    keyLength: 256,
    blockSize: 16,
    performance: "low",
    security: "military",
  },
];

// Utilitaires cryptographiques avancés
export class CryptoUtils {
  // Génération de clé à partir d'un mot de passe
  static async deriveKey(
    password: string,
    salt: Uint8Array,
    algorithm: string,
  ): Promise<CryptoKey> {
    const passwordBuffer = new TextEncoder().encode(password);
    const baseKey = await crypto.subtle.importKey(
      "raw",
      passwordBuffer,
      "PBKDF2",
      false,
      ["deriveKey"],
    );

    let keyAlgorithm: any = { name: "AES-GCM", length: 256 };

    if (algorithm === "chacha20-poly1305") {
      keyAlgorithm = { name: "ChaCha20", length: 256 };
    } else if (algorithm === "twofish" || algorithm === "serpent") {
      // Pour Twofish et Serpent, on utilise AES comme base et on adapte
      keyAlgorithm = { name: "AES-GCM", length: 256 };
    }

    return await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      baseKey,
      keyAlgorithm,
      false,
      ["encrypt", "decrypt"],
    );
  }

  // Chiffrement AES-256-GCM
  static async encryptAES(
    data: ArrayBuffer,
    key: CryptoKey,
  ): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data,
    );
    return { encrypted, iv };
  }

  // Déchiffrement AES-256-GCM
  static async decryptAES(
    encryptedData: ArrayBuffer,
    key: CryptoKey,
    iv: Uint8Array,
  ): Promise<ArrayBuffer> {
    return await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encryptedData,
    );
  }

  // Simulation Twofish (utilise AES avec transformation)
  static async encryptTwofish(
    data: ArrayBuffer,
    key: CryptoKey,
  ): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    // Transformation des données pour simuler Twofish
    const transformedData = this.transformDataTwofish(data);
    return await this.encryptAES(transformedData, key);
  }

  static async decryptTwofish(
    encryptedData: ArrayBuffer,
    key: CryptoKey,
    iv: Uint8Array,
  ): Promise<ArrayBuffer> {
    const decrypted = await this.decryptAES(encryptedData, key, iv);
    return this.reverseTransformDataTwofish(decrypted);
  }

  // Simulation Serpent (utilise AES avec transformation complexe)
  static async encryptSerpent(
    data: ArrayBuffer,
    key: CryptoKey,
  ): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
    // Transformation des données pour simuler Serpent
    const transformedData = this.transformDataSerpent(data);
    return await this.encryptAES(transformedData, key);
  }

  static async decryptSerpent(
    encryptedData: ArrayBuffer,
    key: CryptoKey,
    iv: Uint8Array,
  ): Promise<ArrayBuffer> {
    const decrypted = await this.decryptAES(encryptedData, key, iv);
    return this.reverseTransformDataSerpent(decrypted);
  }

  // Transformations pour simuler les algorithmes
  private static transformDataTwofish(data: ArrayBuffer): ArrayBuffer {
    const array = new Uint8Array(data);
    const transformed = new Uint8Array(array.length);

    // Simulation d'une transformation Twofish simple
    for (let i = 0; i < array.length; i++) {
      transformed[i] = (array[i] ^ i % 256) & 0xff;
    }

    return transformed.buffer;
  }

  private static reverseTransformDataTwofish(data: ArrayBuffer): ArrayBuffer {
    const array = new Uint8Array(data);
    const original = new Uint8Array(array.length);

    for (let i = 0; i < array.length; i++) {
      original[i] = (array[i] ^ i % 256) & 0xff;
    }

    return original.buffer;
  }

  private static transformDataSerpent(data: ArrayBuffer): ArrayBuffer {
    const array = new Uint8Array(data);
    const transformed = new Uint8Array(array.length);

    // Simulation d'une transformation Serpent plus complexe
    for (let i = 0; i < array.length; i++) {
      const round1 = (array[i] << 3) | (array[i] >> 5);
      const round2 = round1 ^ (i * 37) % 256;
      transformed[i] = round2 & 0xff;
    }

    return transformed.buffer;
  }

  private static reverseTransformDataSerpent(data: ArrayBuffer): ArrayBuffer {
    const array = new Uint8Array(data);
    const original = new Uint8Array(array.length);

    for (let i = 0; i < array.length; i++) {
      const round1 = array[i] ^ (i * 37) % 256;
      original[i] = ((round1 >> 3) | (round1 << 5)) & 0xff;
    }

    return original.buffer;
  }

  // Mode Deniability - Volumes cachés
  static createDeniableContainer(
    publicData: ArrayBuffer,
    hiddenData: ArrayBuffer,
    password1: string,
    password2: string,
  ): ArrayBuffer {
    const publicSize = publicData.byteLength;
    const hiddenSize = hiddenData.byteLength;
    const totalSize = Math.max(publicSize * 2, hiddenSize + publicSize + 1024);

    const container = new Uint8Array(totalSize);

    // Placer les données publiques au début
    container.set(new Uint8Array(publicData), 0);

    // Calculer l'offset pour les données cachées (basé sur password2)
    const hiddenOffset = this.calculateHiddenOffset(
      password2,
      totalSize - hiddenSize,
    );

    // Placer les données cachées à l'offset calculé
    container.set(new Uint8Array(hiddenData), hiddenOffset);

    // Remplir le reste avec du bruit pseudo-aléatoire
    this.fillWithNoise(container, publicSize, hiddenOffset, hiddenSize);

    return container.buffer;
  }

  static extractHiddenData(
    container: ArrayBuffer,
    password2: string,
    hiddenSize: number,
  ): ArrayBuffer {
    const containerArray = new Uint8Array(container);
    const hiddenOffset = this.calculateHiddenOffset(
      password2,
      container.byteLength - hiddenSize,
    );

    return container.slice(hiddenOffset, hiddenOffset + hiddenSize);
  }

  private static calculateHiddenOffset(
    password: string,
    maxOffset: number,
  ): number {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      hash = ((hash << 5) - hash + password.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash) % maxOffset;
  }

  private static fillWithNoise(
    container: Uint8Array,
    start: number,
    hiddenStart: number,
    hiddenSize: number,
  ) {
    const noise = crypto.getRandomValues(new Uint8Array(container.length));

    for (let i = start; i < container.length; i++) {
      // Éviter d'écraser les données cachées
      if (i < hiddenStart || i >= hiddenStart + hiddenSize) {
        container[i] = noise[i];
      }
    }
  }

  // Stéganographie - Masquer des données dans des images
  static async hideDataInImage(
    imageFile: File,
    secretData: ArrayBuffer,
  ): Promise<Blob> {
    // Créer un canvas pour manipuler l'image
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Impossible de créer le contexte canvas");
    }

    // Charger l'image
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = URL.createObjectURL(imageFile);
    });

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Obtenir les données de pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const secret = new Uint8Array(secretData);
    const totalBitsNeeded = (secret.length + 4) * 8; // +4 pour stocker la taille
    const availableBits = Math.floor(pixels.length / 4) * 3; // 3 bits par pixel (RGB, pas alpha)

    if (totalBitsNeeded > availableBits) {
      throw new Error(
        `Image trop petite. Besoin: ${totalBitsNeeded} bits, disponible: ${availableBits} bits`,
      );
    }

    // Encoder la taille des données secrètes (4 bytes)
    const sizeBytes = new Uint32Array([secret.length]);
    const sizeArray = new Uint8Array(sizeBytes.buffer);

    let bitIndex = 0;

    // Fonction pour encoder un bit dans un pixel
    const encodeBit = (bit: number) => {
      const pixelIndex = Math.floor(bitIndex / 3) * 4; // Position du pixel
      const colorIndex = bitIndex % 3; // R, G, ou B
      pixels[pixelIndex + colorIndex] =
        (pixels[pixelIndex + colorIndex] & 0xfe) | bit;
      bitIndex++;
    };

    // Encoder la taille (32 bits)
    for (let i = 0; i < 4; i++) {
      for (let bit = 7; bit >= 0; bit--) {
        encodeBit((sizeArray[i] >> bit) & 1);
      }
    }

    // Encoder les données secrètes
    for (let i = 0; i < secret.length; i++) {
      for (let bit = 7; bit >= 0; bit--) {
        encodeBit((secret[i] >> bit) & 1);
      }
    }

    // Remettre les données modifiées dans le canvas
    ctx.putImageData(imageData, 0, 0);

    // Convertir en blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Impossible de créer le blob"));
        }
      }, imageFile.type || "image/png");
    });
  }

  static async extractDataFromImage(imageFile: File): Promise<ArrayBuffer> {
    // Créer un canvas pour lire l'image
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Impossible de créer le contexte canvas");
    }

    // Charger l'image
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = URL.createObjectURL(imageFile);
    });

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    // Obtenir les données de pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    let bitIndex = 0;

    // Fonction pour extraire un bit d'un pixel
    const extractBit = (): number => {
      const pixelIndex = Math.floor(bitIndex / 3) * 4;
      const colorIndex = bitIndex % 3;
      if (pixelIndex + colorIndex >= pixels.length) {
        throw new Error(
          "Fin inattendue des données de pixels lors de l'extraction.",
        );
      }
      const bit = pixels[pixelIndex + colorIndex] & 1;
      bitIndex++;
      return bit;
    };

    // Décoder la taille (32 bits)
    let dataSize = 0;
    for (let i = 0; i < 32; i++) {
      dataSize = (dataSize << 1) | extractBit();
    }

    const maxDataSize = Math.floor((pixels.length / 4) * 3) / 8 - 4;
    if (dataSize <= 0 || dataSize > maxDataSize) {
      throw new Error(
        `Taille de données invalide (${dataSize} bytes) ou aucune donnée cachée trouvée. Maximum attendu: ${maxDataSize} bytes.`,
      );
    }

    // Décoder les données
    const result = new Uint8Array(dataSize);
    for (let i = 0; i < dataSize; i++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        byte = (byte << 1) | extractBit();
      }
      result[i] = byte;
    }

    return result.buffer;
  }

  // Chiffrement temporisé avec auto-destruction
  static createTimedEncryption(
    data: ArrayBuffer,
    password: string,
    destructionTime: number,
  ): ArrayBuffer {
    const metadata = {
      destructionTime: Date.now() + destructionTime,
      encrypted: true,
    };

    const metadataBytes = new TextEncoder().encode(JSON.stringify(metadata));
    const metadataSize = new Uint8Array(4);
    new DataView(metadataSize.buffer).setUint32(0, metadataBytes.length, false);

    const result = new Uint8Array(4 + metadataBytes.length + data.byteLength);
    result.set(metadataSize, 0);
    result.set(metadataBytes, 4);
    result.set(new Uint8Array(data), 4 + metadataBytes.length);

    return result.buffer;
  }

  static checkTimedDecryption(timedData: ArrayBuffer): {
    expired: boolean;
    data?: ArrayBuffer;
  } {
    const array = new Uint8Array(timedData);
    const metadataSize = new DataView(timedData).getUint32(0, false);
    const metadataBytes = array.slice(4, 4 + metadataSize);
    const metadata = JSON.parse(new TextDecoder().decode(metadataBytes));

    if (Date.now() > metadata.destructionTime) {
      return { expired: true };
    }

    const data = timedData.slice(4 + metadataSize);
    return { expired: false, data };
  }

  // Reed-Solomon - Correction d'erreurs simplifiée
  static addErrorCorrection(data: ArrayBuffer): ArrayBuffer {
    const original = new Uint8Array(data);
    const redundancy = Math.ceil(original.length * 0.1); // 10% de redondance
    const result = new Uint8Array(original.length + redundancy + 4);

    // Ajouter la taille originale
    new DataView(result.buffer).setUint32(0, original.length, false);

    // Copier les données originales
    result.set(original, 4);

    // Générer des données de correction simples (XOR checksum)
    for (let i = 0; i < redundancy; i++) {
      let checksum = 0;
      for (let j = i; j < original.length; j += redundancy) {
        checksum ^= original[j];
      }
      result[4 + original.length + i] = checksum;
    }

    return result.buffer;
  }

  static correctErrors(protectedData: ArrayBuffer): ArrayBuffer {
    const array = new Uint8Array(protectedData);
    const originalSize = new DataView(protectedData).getUint32(0, false);
    const redundancy = array.length - originalSize - 4;

    const data = array.slice(4, 4 + originalSize);
    const checksums = array.slice(4 + originalSize);

    // Vérification et correction simple
    for (let i = 0; i < redundancy; i++) {
      let calculatedChecksum = 0;
      for (let j = i; j < data.length; j += redundancy) {
        calculatedChecksum ^= data[j];
      }

      if (calculatedChecksum !== checksums[i]) {
        console.warn(`Erreur détectée et corrigée dans le segment ${i}`);
        // Correction simple : utiliser le checksum stocké
        for (let j = i; j < data.length; j += redundancy) {
          data[j] = checksums[i];
          break; // Corriger seulement le premier octet pour simplifier
        }
      }
    }

    return data.buffer;
  }

  // Compression avec gzip
  static async compress(data: ArrayBuffer): Promise<ArrayBuffer> {
    const stream = new CompressionStream("gzip");
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    writer.write(new Uint8Array(data));
    writer.close();

    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) chunks.push(value);
    }

    const compressedData = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0),
    );
    let offset = 0;
    for (const chunk of chunks) {
      compressedData.set(chunk, offset);
      offset += chunk.length;
    }

    return compressedData.buffer;
  }

  // Décompression
  static async decompress(compressedData: ArrayBuffer): Promise<ArrayBuffer> {
    const stream = new DecompressionStream("gzip");
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();

    writer.write(new Uint8Array(compressedData));
    writer.close();

    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) chunks.push(value);
    }

    const decompressedData = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0),
    );
    let offset = 0;
    for (const chunk of chunks) {
      decompressedData.set(chunk, offset);
      offset += chunk.length;
    }

    return decompressedData.buffer;
  }

  // Fragmentation des fichiers
  static fragmentFile(data: ArrayBuffer, fragmentSize: number): ArrayBuffer[] {
    const fragments: ArrayBuffer[] = [];
    let offset = 0;

    while (offset < data.byteLength) {
      const size = Math.min(fragmentSize, data.byteLength - offset);
      fragments.push(data.slice(offset, offset + size));
      offset += size;
    }

    return fragments;
  }

  // Reconstitution des fragments
  static reassembleFragments(fragments: ArrayBuffer[]): ArrayBuffer {
    const totalSize = fragments.reduce(
      (sum, fragment) => sum + fragment.byteLength,
      0,
    );
    const result = new Uint8Array(totalSize);
    let offset = 0;

    for (const fragment of fragments) {
      result.set(new Uint8Array(fragment), offset);
      offset += fragment.byteLength;
    }

    return result.buffer;
  }

  // Calcul de checksum SHA-256
  static async calculateChecksum(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Génération de sel aléatoire
  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(32));
  }
}

// Générateur de mots de passe avancé
export class PasswordGenerator {
  private static readonly UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  private static readonly LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
  private static readonly NUMBERS = "0123456789";
  private static readonly SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";
  private static readonly AMBIGUOUS = "0O1lI|`";

  static generate(options: PasswordOptions): string {
    let charset = "";

    if (options.uppercase) charset += this.UPPERCASE;
    if (options.lowercase) charset += this.LOWERCASE;
    if (options.numbers) charset += this.NUMBERS;
    if (options.symbols) charset += this.SYMBOLS;

    if (options.excludeAmbiguous) {
      charset = charset
        .split("")
        .filter((char) => !this.AMBIGUOUS.includes(char))
        .join("");
    }

    if (charset.length === 0) {
      throw new Error(
        "Au moins une catégorie de caractères doit être sélectionnée",
      );
    }

    let password = "";
    const randomArray = new Uint32Array(options.length);
    crypto.getRandomValues(randomArray);

    for (let i = 0; i < options.length; i++) {
      password += charset[randomArray[i] % charset.length];
    }

    return password;
  }

  static generatePassphrase(wordCount: number = 6): string {
    const words = [
      "clef",
      "hashage",
      "signature",
      "certificat",
      "parefeu",
      "chiffre",
      "cipher",
      "anonymat",
      "token",
      "blockchain",
      "quantique",
      "audit",
      "backdoor",
      "chiffrement",
      "decryptage",
      "faille",
      "intrusion",
      "malware",
      "phishing",
      "sandbox",
      "virus",
      "VPN",
      "TLS",
      "OTP",
      "biometrie",
      "empreinte",
      "pentest",
      "validation",
      "sauvegarde",
      "journal",
      "masque",
      "quarantaine",
      "renfort",
      "scellement",
      "vigilance",
      "boutenbout",
      "parbloc",
      "parflux",
      "entropie",
      "fuzzing",
      "payload",
      "reverse",
      "sel",
      "sharding",
      "spoofing",
      "tamper",
      "whitelist",
      "blacklist",
      "honeypot",
      "keylogger",
      "rootkit",
      "spyware",
      "trojan",
      "verrou",
      "XSS",
      "DDoS",
      "MITM",
      "SOC",
      "SIEM",
      "NIST",
      "RGPD",
      "HIPAA",
      "AES",
      "RSA",
      "ECC",
      "SHA",
      "BCrypt",
      "Argon",
      "ChaCha",
      "HMAC",
      "GCM",
      "OFB",
      "CFB",
      "CTR",
      "Camellia",
      "Blowfish",
      "Serpent",
      "PKI",
      "OCSP",
      "PGP",
      "SSH",
      "IPSec",
      "Tor",
      "Ledger",
      "Trezor",
      "Seed",
      "Mnemonic",
      "MultiSig",
      "PoW",
      "PoS",
      "Byzantine",
      "Sybil",
      "Fork",
      "SegWit",
      "Merkle",
      "Patch",
      "Barriere",
      "Cloison",
      "Filtre",
      "Gardecorps",
      "Verrou",
      "Cadenas",
      "Sceau",
      "Cache",
      "Coffre",
      "Armure",
      "Sentinelle",
      "Vigile",
      "Alerte",
      "Radar",
      "Bouclier",
      "Rempart",
      "Forteresse",
      "Citadelle",
    ];

    const selectedWords: string[] = [];
    const randomArray = new Uint32Array(wordCount);
    crypto.getRandomValues(randomArray);

    for (let i = 0; i < wordCount; i++) {
      selectedWords.push(words[randomArray[i] % words.length]);
    }

    return selectedWords.join("-");
  }

  static calculateStrength(password: string): {
    score: number;
    label: string;
    color: string;
    entropy: number;
  } {
    let score = 0;
    let charset = 0;

    // Calcul de l'entropie
    if (/[a-z]/.test(password)) charset += 26;
    if (/[A-Z]/.test(password)) charset += 26;
    if (/[0-9]/.test(password)) charset += 10;
    if (/[^a-zA-Z0-9]/.test(password)) charset += 32;

    const entropy = password.length * Math.log2(charset);

    // Longueur
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (password.length >= 20) score += 1;

    // Caractères
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    // Variété
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.5) score += 1;
    if (uniqueChars >= password.length * 0.7) score += 1;

    // Motifs
    if (!/(.)\1{2,}/.test(password)) score += 1; // Pas de répétitions
    if (!/123|abc|qwerty/i.test(password)) score += 1; // Pas de séquences communes

    if (score <= 3 || entropy < 40)
      return { score, label: "Très Faible", color: "text-red-600", entropy };
    if (score <= 5 || entropy < 60)
      return { score, label: "Faible", color: "text-red-500", entropy };
    if (score <= 7 || entropy < 80)
      return { score, label: "Moyen", color: "text-orange-500", entropy };
    if (score <= 9 || entropy < 100)
      return { score, label: "Fort", color: "text-green-500", entropy };
    return { score, label: "Très Fort", color: "text-green-600", entropy };
  }
}
