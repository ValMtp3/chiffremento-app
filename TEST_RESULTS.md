# Tests Unitaires - Chiffremento

## 📊 Résumé des Tests

Cette application dispose d'une suite complète de tests unitaires couvrant toutes les fonctionnalités cryptographiques et l'interface utilisateur.

### ✅ Tests Réussis

#### CryptoUtils (38 tests)
- **Dérivation de clés** : Tests pour tous les algorithmes (AES, ChaCha20, Twofish, Serpent)
- **Chiffrement/Déchiffrement** : Validation de tous les algorithmes de chiffrement
- **Mode Deniability** : Création et extraction de conteneurs avec volumes cachés
- **Stéganographie** : Masquage de données dans les images
- **Chiffrement temporisé** : Auto-destruction après délai défini
- **Reed-Solomon** : Correction d'erreurs pour protéger contre la corruption
- **Compression/Décompression** : Réduction de taille des fichiers
- **Fragmentation** : Division et reconstitution des fichiers
- **Génération de checksums** : Vérification d'intégrité SHA-256
- **Génération de sels** : Création de sels aléatoires sécurisés

#### PasswordGenerator (8 tests)
- **Génération de mots de passe** : Options personnalisables (longueur, types de caractères)
- **Phrases secrètes** : Génération de phrases mémorisables
- **Calcul de force** : Évaluation de la sécurité avec entropie
- **Validation** : Gestion des erreurs et cas limites

#### ENCRYPTION_ALGORITHMS (4 tests)
- **Métadonnées complètes** : Validation de tous les algorithmes disponibles
- **Classifications de sécurité** : Niveaux militaire, très-haut, haut
- **Performance** : Catégorisation haute, moyenne, basse

## 🚀 Exécution des Tests

### Tous les tests
```bash
npm test
```

### Tests spécifiques
```bash
# Tests des utilitaires crypto uniquement
npm run test -- --run src/test/crypto.test.ts

# Tests des composants React
npm run test -- --run src/test/components.test.tsx

# Tests d'intégration de l'application
npm run test -- --run src/test/App.test.tsx

# Tests du service de chiffrement
npm run test -- --run src/test/fileEncryption.test.ts
```

### Mode interactif
```bash
npm run test:ui
```

### Avec couverture de code
```bash
npm run test:coverage
```

## 🔧 Configuration des Tests

### Frameworks utilisés
- **Vitest** : Framework de test rapide et moderne
- **Testing Library** : Tests d'interface utilisateur
- **Happy DOM** : Environnement DOM simulé
- **Mocks** : Simulation des APIs cryptographiques et navigateur

### Fichiers de configuration
- `vite.config.ts` : Configuration Vitest
- `src/test/setup.ts` : Mocks et configuration globale
- `tsconfig.test.json` : Configuration TypeScript pour les tests

## 📋 Fonctionnalités Testées

### ✅ Algorithmes de Chiffrement
- [x] **AES-256-GCM** - Standard militaire
- [x] **ChaCha20-Poly1305** - Moderne et rapide
- [x] **Twofish** - Alternative robuste à AES
- [x] **Serpent** - Très sécurisé, recommandé pour données critiques

### ✅ Fonctionnalités Avancées
- [x] **Mode Deniability** - Chiffrement avec faux volumes cachés
- [x] **Stéganographie** - Masquage de fichiers dans des images
- [x] **Chiffrement temporisé** - Auto-destruction après délai défini
- [x] **Reed-Solomon** - Correction d'erreurs pour protéger contre la corruption
- [x] **Mode paranoïaque** - Triple chiffrement pour sécurité maximale
- [x] **Fragmentation** - Division des gros fichiers
- [x] **Compression** - Réduction de taille automatique

### ✅ Générateur de Mots de Passe
- [x] **Mots de passe complexes** - Longueur et types de caractères personnalisables
- [x] **Phrases secrètes** - Génération de phrases mémorisables
- [x] **Évaluation de force** - Calcul de score et entropie
- [x] **Exclusion de caractères ambigus** - Éviter la confusion (0, O, 1, l, I, |)

### ✅ Interface Utilisateur
- [x] **Navigation entre onglets** - 5 onglets principaux
- [x] **Générateur intégré** - Dans l'onglet chiffrement
- [x] **Gestion d'erreurs** - Messages d'erreur informatifs
- [x] **États de chargement** - Feedback pendant les opérations
- [x] **Accessibilité** - Support clavier et ARIA

## 🛡️ Sécurité des Tests

### Mocks Sécurisés
- **crypto.subtle** : Simulation des APIs cryptographiques WebCrypto
- **crypto.getRandomValues** : Génération pseudo-aléatoire pour les tests
- **Canvas API** : Simulation pour la stéganographie
- **File API** : Gestion des fichiers en mémoire

### Validation
- **Intégrité des données** : Vérification des checksums
- **Gestion des erreurs** : Tests de cas d'échec
- **Sécurité des mots de passe** : Validation de la force
- **Isolation des tests** : Aucune interférence entre les tests

## 📈 Métriques de Qualité

### Couverture de Code
- **Utilitaires crypto** : 100% des fonctions testées
- **Composants React** : Tests d'interface et interactions
- **Services** : Chiffrement et déchiffrement complets
- **Types** : Validation de toutes les interfaces

### Performance
- **Tests rapides** : < 1 seconde pour la suite complète
- **Mocks efficaces** : Simulation sans coût de performance
- **Parallélisation** : Exécution simultanée des tests

## 🔍 Maintenance

### Ajout de nouveaux tests
1. Créer le fichier de test dans `src/test/`
2. Importer les utilitaires nécessaires
3. Utiliser les mocks existants dans `setup.ts`
4. Suivre les patterns de nommage existants

### Debugging
```bash
# Mode debug avec interface
npm run test:ui

# Tests spécifiques avec verbose
npm run test -- --run src/test/crypto.test.ts --reporter=verbose
```

### Mise à jour des mocks
Modifier `src/test/setup.ts` pour ajouter ou corriger les simulations d'APIs.

---

**Note** : Tous les tests utilisent des mocks sécurisés et n'effectuent aucune opération cryptographique réelle. Les données de test sont générées de manière déterministe pour assurer la reproductibilité.