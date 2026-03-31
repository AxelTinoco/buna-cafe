# Shopify Backup — Buna

Backup automático semanal de productos Shopify a Google Drive y correo electrónico.

**Frecuencia:** Cada lunes a las 9:00 AM CST
**Destino:** Google Drive (carpeta "Backup Shopify") + correo electrónico adjunto

---

## Secrets requeridos en GitHub

Ir a: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Valor |
|--------|-------|
| `SHOPIFY_STORE_URL` | `tutienda.myshopify.com` (sin https://) |
| `SHOPIFY_ACCESS_TOKEN` | Token de Admin API (shpat_xxxx) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Contenido completo del JSON de credenciales |
| `GOOGLE_DRIVE_FOLDER_ID` | ID de la carpeta en Drive |
| `BACKUP_EMAIL` | Correo donde llega el backup |

---

## Ejecución manual (para probar)

1. Ir al repositorio en GitHub
2. Pestaña **Actions** → **Shopify Products Backup**
3. Botón **Run workflow** → Run workflow

---

## Estructura

```
shopify-backup/
├── .github/
│   └── workflows/
│       └── shopify-backup.yml   ← Cron job semanal
├── scripts/
│   └── backup.js               ← Lógica del backup
└── package.json
```
