# Security Architecture & Threat Considerations

Security awareness and defense-in-depth are foundational principles of the AgilePulse application.

---

## 1. Threat Model & Implemented Defenses

| Threat Category | Potential Attack Vector | Implemented Mitigation |
|---|---|---|
| **Authentication & Brute Force** | Password guessing, credential stuffing on `/auth/login` | Passwords hashed using salted `bcrypt`. In-memory sliding window rate limiter restricts auth endpoints to 20 attempts/minute per IP (`AUTH_RATE_LIMIT_MAX_REQUESTS`). |
| **Broken Object Level Authorization (BOLA / IDOR)** | An attacker modifies `/projects/{id}/stories` or `/tasks/{id}` belonging to another team | Every request checks project membership via `ProjectService.check_membership()` and role privileges (`check_owner()`) before querying or mutating data. |
| **SQL Injection (SQLi)** | Malicious SQL inputs in search filters or path parameters | 100% of database queries use SQLAlchemy 2.0 ORM with parameterized inputs. No raw SQL string concatenation exists in the codebase. |
| **Cross-Site Scripting (XSS)** | Injected JavaScript payloads in task titles, markdown descriptions, or comments | React automatically escapes string values during JSX rendering. FastAPI enforces strict Content-Security-Policy (CSP) headers. |
| **Cross-Origin Resource Sharing (CORS)** | Unauthorized third-party web apps making credentialed API calls | FastAPI `CORSMiddleware` restricts allowed origins strictly to configured domains in `BACKEND_CORS_ORIGINS`. |
| **Information Leakage** | Verbose error stack traces exposing server filepaths | Global exception handlers intercept all uncaught errors, masking internal details in production and returning standardized `{ code, message }` responses. |
| **Denial of Service (DoS) in Jobs** | Poison-pill payloads causing crash loops in the background worker | Handlers are wrapped in try/except blocks with exponential backoff and jitter. A poisoned job transitions to `dead` after 3 attempts without halting the worker loop. |

---

## 2. Security Headers

FastAPI applies defensive HTTP headers on every response via `SecurityHeadersMiddleware`:
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;
```

---

## 3. Password Hashing & JWT Integrity

- **Password Storage**: Passwords are never stored in plaintext. They are salted and hashed using `bcrypt.hashpw()` with dynamically generated salts.
- **JWT Cryptography**: Signed using HMAC-SHA256 (`HS256`) with a cryptographically random secret (`SECRET_KEY`). Tokens include:
  - `sub`: User ID
  - `iat`: Issued-at epoch timestamp
  - `exp`: Expiration epoch timestamp (24-hour lifetime)
- **Secret Management**: No production secrets or API keys are committed to version control. Default development keys are overridable via `.env`. A complete `.env.example` template is provided.

---

## 4. Known Limitations & Production Hardening Roadmap

While AgilePulse meets all requirements for a small team deployment, the following enhancements are recommended prior to enterprise multi-tenant rollout:

1. **Distributed Rate Limiting**: The current rate limiter uses an in-memory dictionary. In a horizontally scaled cluster behind a round-robin load balancer, a distributed Redis-backed rate limiter (e.g. `slowapi` with Redis) should be used.
2. **Refresh Token Rotation**: Currently, a single 24-hour access token is used. Implementing short-lived access tokens (15 minutes) paired with HttpOnly cookie refresh tokens would further reduce the impact of token leakage.
3. **Multi-Factor Authentication (MFA/TOTP)**: Adding optional authenticator app verification (RFC 6238) for project owners and administrative roles.
4. **Content Security Policy Nonces**: Transitioning inline script and style tags to cryptographically generated request nonces.
