// Setup file for tests
import { vi } from "vitest";
import "@testing-library/jest-dom";

// Système de mock crypto ultra-simple pour validation des mots de passe
const passwordStore = new Map<string, string>();
let encryptionCounter = 0;

Object.defineProperty(global, "crypto", {
  value: {
    getRandomValues: vi.fn((arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    randomUUID: vi.fn(() => "test-uuid"),
    subtle: {
      digest: vi.fn(async (algorithm: string, data: ArrayBuffer) => {
        const dataArray = new Uint8Array(data);
        const hash = new Uint8Array(32);
        let seed = 0;
        for (let i = 0; i < dataArray.length; i++) {
          seed = (seed + dataArray[i] * (i + 1)) % 256;
        }
        for (let i = 0; i < 32; i++) {
          hash[i] = (seed + i * 37) % 256;
        }
        return hash.buffer;
      }),
      importKey: vi.fn(async (format: any, keyData: any, algorithm: any) => {
        const passwordBytes = new Uint8Array(keyData);
        const password = new TextDecoder().decode(passwordBytes);
        return { _password: password } as CryptoKey;
      }),
      deriveKey: vi.fn(
        async (
          alg: any,
          baseKey: any,
          derivedAlg: any,
          extractable: any,
          usages: any,
        ) => {
          const password = baseKey._password || "";
          const salt = alg.salt ? Array.from(alg.salt).join(",") : "";
          const keyId = `${password}-${salt}`;
          return { _keyId: keyId, _password: password } as CryptoKey;
        },
      ),
      encrypt: vi.fn(async (algorithm: any, key: any, data: ArrayBuffer) => {
        encryptionCounter++;
        const encId = `enc_${encryptionCounter}`;
        const keyId = key._keyId || "";

        // Store password for this encryption
        passwordStore.set(encId, keyId);

        // Add encryption ID to the end of data
        const result = new Uint8Array(data.byteLength + 16);
        result.set(new Uint8Array(data));

        // Encode encryption ID in last 16 bytes
        const encIdBytes = new TextEncoder().encode(encId.padEnd(16));
        result.set(encIdBytes.slice(0, 16), data.byteLength);

        return result.buffer;
      }),
      decrypt: vi.fn(async (algorithm: any, key: any, data: ArrayBuffer) => {
        const dataArray = new Uint8Array(data);

        if (dataArray.length < 16) {
          throw new Error("Données trop courtes");
        }

        // Extract encryption ID from last 16 bytes
        const encIdBytes = dataArray.slice(-16);
        const encId = new TextDecoder().decode(encIdBytes).trim();

        // Get stored password for this encryption
        const storedKeyId = passwordStore.get(encId);
        const currentKeyId = key._keyId || "";

        if (storedKeyId && storedKeyId !== currentKeyId) {
          throw new Error(
            "Échec de l'authentification - mot de passe incorrect",
          );
        }

        // Return original data without the ID
        return dataArray.slice(0, -16).buffer;
      }),
    },
  },
});

// Mock canvas context with correct steganography support
let mockCanvasWidth = 100;
let mockCanvasHeight = 100;
let mockCanvasData = new Uint8ClampedArray(
  mockCanvasWidth * mockCanvasHeight * 4,
);

// Map to store hidden data per canvas instance
const hiddenDataStore = new Map<HTMLCanvasElement, Uint8Array>();

// Initialize with deterministic data for steganography
const initializeCanvasData = (width: number, height: number) => {
  mockCanvasWidth = width;
  mockCanvasHeight = height;
  mockCanvasData = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < mockCanvasData.length; i += 4) {
    mockCanvasData[i] = 128; // R
    mockCanvasData[i + 1] = 128; // G
    mockCanvasData[i + 2] = 128; // B
    mockCanvasData[i + 3] = 255; // A (full opacity)
  }
};

initializeCanvasData(100, 100);

const mockCanvasContext = {
  fillRect: vi.fn(),
  drawImage: vi.fn((img: any) => {
    // Update canvas size based on image
    mockCanvasWidth = img.width || 100;
    mockCanvasHeight = img.height || 100;
    mockCanvasData = new Uint8ClampedArray(
      mockCanvasWidth * mockCanvasHeight * 4,
    );
    // Fill with image-like data
    for (let i = 0; i < mockCanvasData.length; i += 4) {
      mockCanvasData[i] = Math.floor(Math.random() * 256);
      mockCanvasData[i + 1] = Math.floor(Math.random() * 256);
      mockCanvasData[i + 2] = Math.floor(Math.random() * 256);
      mockCanvasData[i + 3] = 255;
    }
  }),
  getImageData: vi.fn(() => ({
    data: mockCanvasData,
    width: mockCanvasWidth,
    height: mockCanvasHeight,
  })),
  putImageData: vi.fn((imageData: any) => {
    mockCanvasData = new Uint8ClampedArray(imageData.data);
    mockCanvasWidth = imageData.width;
    mockCanvasHeight = imageData.height;

    // Extract hidden data from LSBs for steganography simulation
    try {
      let bitIndex = 0;
      const extractBit = (): number => {
        const pixelIndex = Math.floor(bitIndex / 3) * 4;
        const colorIndex = bitIndex % 3;
        if (pixelIndex + colorIndex >= mockCanvasData.length) return 0;
        const bit = mockCanvasData[pixelIndex + colorIndex] & 1;
        bitIndex++;
        return bit;
      };

      // Try to extract data size (32 bits)
      let dataSize = 0;
      for (let i = 0; i < 32; i++) {
        dataSize = (dataSize << 1) | extractBit();
      }

      if (dataSize > 0 && dataSize < 1000) {
        // Reasonable size limit
        const result = new Uint8Array(dataSize);
        for (let i = 0; i < dataSize; i++) {
          let byte = 0;
          for (let bit = 0; bit < 8; bit++) {
            byte = (byte << 1) | extractBit();
          }
          result[i] = byte;
        }
        hiddenData = result;
      }
    } catch (e) {
      // Ignore extraction errors
    }
  }),
  canvas: {
    get width() {
      return mockCanvasWidth;
    },
    get height() {
      return mockCanvasHeight;
    },
    set width(w: number) {
      mockCanvasWidth = w;
      mockCanvasData = new Uint8ClampedArray(w * mockCanvasHeight * 4);
      // Reset to base values
      for (let i = 0; i < mockCanvasData.length; i += 4) {
        mockCanvasData[i] = 128;
        mockCanvasData[i + 1] = 128;
        mockCanvasData[i + 2] = 128;
        mockCanvasData[i + 3] = 255;
      }
    },
    set height(h: number) {
      mockCanvasHeight = h;
      mockCanvasData = new Uint8ClampedArray(mockCanvasWidth * h * 4);
      // Reset to base values
      for (let i = 0; i < mockCanvasData.length; i += 4) {
        mockCanvasData[i] = 128;
        mockCanvasData[i + 1] = 128;
        mockCanvasData[i + 2] = 128;
        mockCanvasData[i + 3] = 255;
      }
    },
  },
};

// Function to create a mock canvas context for a specific canvas
const createMockCanvasContext = (canvas: HTMLCanvasElement) => {
  const canvasData = new Uint8ClampedArray(canvas.width * canvas.height * 4);

  // Initialize with base color
  for (let i = 0; i < canvasData.length; i += 4) {
    canvasData[i] = 128; // R
    canvasData[i + 1] = 128; // G
    canvasData[i + 2] = 128; // B
    canvasData[i + 3] = 255; // A (full opacity)
  }

  return {
    fillRect: vi.fn(),
    fillStyle: "",
    drawImage: vi.fn((img: any) => {
      // Update canvas size if needed
      if (canvas.width !== img.width || canvas.height !== img.height) {
        canvas.width = img.width || canvas.width;
        canvas.height = img.height || canvas.height;
      }

      // Check if this image has steganographic data
      const blob = Array.from(blobStore.values()).find((b) =>
        URL.createObjectURL(b).includes(img.src.split("/").pop()),
      );

      if (blob) {
        blob.arrayBuffer().then(async (buffer) => {
          const extractedData = await (global as any).extractSteganographicData(
            new Blob([buffer]),
          );
          if (extractedData) {
            hiddenDataStore.set(canvas, extractedData);
          }
        });
      }
    }),
    getImageData: vi.fn(() => ({
      data: canvasData,
      width: canvas.width,
      height: canvas.height,
    })),
    putImageData: vi.fn((imageData: any) => {
      // When putting image data, check if it contains steganographic information
      const pixels = imageData.data;

      try {
        // Try to extract steganographic data from LSBs
        let bitIndex = 0;
        const extractBit = (): number => {
          const pixelIndex = Math.floor(bitIndex / 3) * 4;
          const colorIndex = bitIndex % 3;
          if (pixelIndex + colorIndex >= pixels.length) return 0;
          const bit = pixels[pixelIndex + colorIndex] & 1;
          bitIndex++;
          return bit;
        };

        // Extract data size (32 bits)
        let dataSize = 0;
        for (let i = 0; i < 32; i++) {
          dataSize = (dataSize << 1) | extractBit();
        }

        // If size is reasonable, extract the hidden data
        if (dataSize > 0 && dataSize < 10000) {
          const result = new Uint8Array(dataSize);
          for (let i = 0; i < dataSize; i++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
              byte = (byte << 1) | extractBit();
            }
            result[i] = byte;
          }
          hiddenDataStore.set(canvas, result);
        }
      } catch (e) {
        // Ignore extraction errors
      }

      // Update the canvas data
      canvasData.set(new Uint8ClampedArray(imageData.data));
    }),
    canvas: canvas,
  };
};

HTMLCanvasElement.prototype.getContext = vi.fn(function () {
  return createMockCanvasContext(this as HTMLCanvasElement);
});

// Mock canvas toBlob with steganography support
HTMLCanvasElement.prototype.toBlob = vi.fn(function (callback, type) {
  const canvas = this as HTMLCanvasElement;
  const ctx = canvas.getContext("2d") as any;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Create blob with embedded steganography data if any
  const hiddenData = hiddenDataStore.get(canvas);
  let blobData: Uint8Array;

  if (hiddenData) {
    // Include hidden data in blob (simulating steganography)
    const headerSize = 8; // Simple header
    blobData = new Uint8Array(headerSize + hiddenData.length);
    // Magic header to identify steganographic data
    blobData[0] = 0x53; // 'S'
    blobData[1] = 0x54; // 'T'
    blobData[2] = 0x45; // 'E'
    blobData[3] = 0x47; // 'G'
    // Data size (4 bytes)
    const sizeView = new DataView(blobData.buffer, 4, 4);
    sizeView.setUint32(0, hiddenData.length, true);
    // Hidden data
    blobData.set(hiddenData, headerSize);
  } else {
    // Regular image data
    const compressedSize = Math.max(
      100,
      Math.floor(imageData.data.length * 0.1),
    );
    blobData = new Uint8Array(compressedSize);
    for (let i = 0; i < compressedSize; i++) {
      blobData[i] = (i * 17 + 128) % 256; // Deterministic pattern
    }
  }

  const blob = new Blob([blobData], { type: type || "image/png" });
  setTimeout(() => callback(blob), 1);
});

// Mock Image constructor with steganography support
global.Image = class MockImage {
  onload: any;
  onerror: any;
  width: number = 100;
  height: number = 100;
  _src: string = "";

  constructor() {
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 10);
  }

  get src() {
    return this._src;
  }

  set src(value: string) {
    this._src = value;

    // Determine image size based on URL
    if (value.includes("small")) {
      this.width = 2;
      this.height = 2;
    } else if (value.includes("blob:")) {
      // Get blob from store and check for steganographic data
      const blob = Array.from(blobStore.values()).find(
        (b) => URL.createObjectURL(b) === value.split("-small")[0],
      );

      if (blob) {
        // Check if blob contains steganographic data
        blob.arrayBuffer().then((buffer) => {
          const data = new Uint8Array(buffer);
          if (
            data.length >= 8 &&
            data[0] === 0x53 &&
            data[1] === 0x54 &&
            data[2] === 0x45 &&
            data[3] === 0x47
          ) {
            // This blob has steganographic data
            this.width = 100;
            this.height = 100;
          } else {
            // Regular blob
            this.width = Math.max(50, Math.min(200, data.length / 100));
            this.height = this.width;
          }
        });
      } else {
        this.width = 100;
        this.height = 100;
      }
    }

    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 10);
  }
} as any;

// Mock URL.createObjectURL with steganography support
const blobStore = new Map<string, Blob>();
let blobCounter = 0;

global.URL.createObjectURL = vi.fn((blob: Blob) => {
  const url = `blob:test-url-${++blobCounter}`;
  blobStore.set(url, blob);

  // Check blob content to determine URL suffix
  if (blob.size < 50) {
    return `${url}-small`;
  }

  return url;
});

global.URL.revokeObjectURL = vi.fn((url: string) => {
  blobStore.delete(url);
});

// Helper function to extract steganographic data from blob
global.extractSteganographicData = async (
  blob: Blob,
): Promise<Uint8Array | null> => {
  const buffer = await blob.arrayBuffer();
  const data = new Uint8Array(buffer);

  if (
    data.length >= 8 &&
    data[0] === 0x53 &&
    data[1] === 0x54 &&
    data[2] === 0x45 &&
    data[3] === 0x47
  ) {
    const sizeView = new DataView(buffer, 4, 4);
    const hiddenSize = sizeView.getUint32(0, true);

    if (hiddenSize > 0 && hiddenSize <= data.length - 8) {
      return data.slice(8, 8 + hiddenSize);
    }
  }

  return null;
};

// Mock File constructor
global.File = class extends Blob {
  name: string;
  lastModified: number;

  constructor(chunks: BlobPart[], filename: string, options?: FilePropertyBag) {
    super(chunks, options);
    this.name = filename;
    this.lastModified = Date.now();
  }
} as any;

// Mock CompressionStream and DecompressionStream
global.CompressionStream = class {
  readable: ReadableStream;
  writable: WritableStream;

  constructor(format: string) {
    const chunks: Uint8Array[] = [];
    let controller: ReadableStreamDefaultController<Uint8Array>;

    this.readable = new ReadableStream({
      start(ctrl) {
        controller = ctrl;
      },
    });

    this.writable = new WritableStream({
      write(chunk: Uint8Array) {
        chunks.push(chunk);
      },
      close() {
        // Process all chunks when stream closes
        const totalLength = chunks.reduce(
          (sum, chunk) => sum + chunk.length,
          0,
        );
        const allData = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          allData.set(chunk, offset);
          offset += chunk.length;
        }

        // Simulate compression - make it slightly smaller
        const compressed = new Uint8Array(
          Math.max(1, Math.floor(allData.length * 0.8)),
        );
        for (let i = 0; i < compressed.length; i++) {
          compressed[i] = allData[i % allData.length] ^ 0xaa;
        }

        // Enqueue compressed data and close
        if (controller) {
          controller.enqueue(compressed);
          controller.close();
        }
      },
    });
  }
} as any;

global.DecompressionStream = class {
  readable: ReadableStream;
  writable: WritableStream;

  constructor(format: string) {
    const chunks: Uint8Array[] = [];
    let controller: ReadableStreamDefaultController<Uint8Array>;

    this.readable = new ReadableStream({
      start(ctrl) {
        controller = ctrl;
      },
    });

    this.writable = new WritableStream({
      write(chunk: Uint8Array) {
        chunks.push(chunk);
      },
      close() {
        // Process all chunks when stream closes
        const totalLength = chunks.reduce(
          (sum, chunk) => sum + chunk.length,
          0,
        );
        const compressedData = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          compressedData.set(chunk, offset);
          offset += chunk.length;
        }

        // Simulate decompression - reverse the compression transformation
        const decompressed = new Uint8Array(
          Math.floor(compressedData.length / 0.8),
        );
        for (let i = 0; i < decompressed.length; i++) {
          decompressed[i] = compressedData[i % compressedData.length] ^ 0xaa;
        }

        // Enqueue decompressed data and close
        if (controller) {
          controller.enqueue(decompressed);
          controller.close();
        }
      },
    });
  }
} as any;

// Mock navigator.clipboard
if (!navigator.clipboard) {
  Object.defineProperty(navigator, "clipboard", {
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(""),
    },
    writable: true,
  });
}

// Mock document.createElement for download links
const originalCreateElement = document.createElement.bind(document);
if (!vi.isMockFunction(document.createElement)) {
  document.createElement = vi.fn((tagName: string) => {
    if (tagName === "a") {
      return {
        href: "",
        download: "",
        click: vi.fn(),
        style: {},
      } as any;
    }
    return originalCreateElement(tagName);
  });
}
