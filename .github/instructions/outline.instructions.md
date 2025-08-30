---
applyTo: "src/**"
description: "This document contains the outline for how the secrets manager works."
---

# 🔒 Secrets Manager Philosophy & Design

This document explains the security and design philosophy for this personal secrets manager built with SvelteKit.  
The goal is **practical personal security** — strong enough for casual attackers, but not overkill.

---

## 1. Philosophy
- **Threat model:** Protect secrets from device theft or server compromise. Not targeting nation-state adversaries.
- **Balance:** Use strong encryption with simple architecture so it’s easy to maintain.
- **Separation of duties:** Encryption keys never live on the server. The server only stores ciphertext.
- **Zero-knowledge:** All encryption/decryption happens client-side in the browser.

---

## 2. Authentication
- **Primary:** WebAuthn (passkeys / security key) for login.  
- **Fallback:** Master password, hashed with Argon2id.  
- **Sessions:** Short-lived (e.g., 30 minutes idle timeout), require re-auth after expiration.

---

## 3. Encryption
- **Algorithm:** AES-256-GCM.  
- **Key derivation (if using password):** Argon2id with salt.  
- **Where keys live:**  
  - Keys are derived and held in memory in the browser only.  
  - Server never stores plaintext or usable keys.  

---

## 4. Storage
### Server - SQLITE
- Store only encrypted data.  
- Schema example:  
  ```sql
  id TEXT PRIMARY KEY,
  name TEXT,
  encryptedValue BLOB,
  iv BLOB,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
