const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// ─── Configuración desde secrets de GitHub ───────────────────────────────────
const SHOPIFY_STORE_URL = process.env.SHOPIFY_STORE_URL;       // tutienda.myshopify.com
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN; // shpat_xxxx
const GOOGLE_SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

// ─── Nombre del archivo con fecha ────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const CSV_FILENAME = `productos_${today}.csv`;
const CSV_PATH = path.join('/tmp', CSV_FILENAME);

// ─── Paso 1: Obtener productos de Shopify ────────────────────────────────────
async function fetchShopifyProducts() {
  console.log('📦 Obteniendo productos de Shopify...');

  const products = [];
  let url = `https://${SHOPIFY_STORE_URL}/admin/api/2024-01/products.json?limit=250&fields=id,title,product_type,vendor,status,tags,variants,images`;

  while (url) {
    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error Shopify API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    products.push(...data.products);

    // Paginación: buscar link al siguiente página en headers
    const linkHeader = response.headers.get('link');
    if (linkHeader && linkHeader.includes('rel="next"')) {
      const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
      url = match ? match[1] : null;
    } else {
      url = null;
    }
  }

  console.log(`✅ ${products.length} productos obtenidos.`);
  return products;
}

// ─── Convertir productos a CSV ────────────────────────────────────────────────
function productsToCSV(products) {
  const headers = [
    'ID',
    'Título',
    'Tipo',
    'Vendor',
    'Status',
    'Tags',
    'Número de variantes',
    'Precio mínimo',
    'Precio máximo',
    'URL imagen principal',
  ];

  const rows = products.map((p) => {
    const prices = p.variants.map((v) => parseFloat(v.price)).filter((n) => !isNaN(n));
    const minPrice = prices.length ? Math.min(...prices) : '';
    const maxPrice = prices.length ? Math.max(...prices) : '';
    const imageUrl = p.images && p.images.length > 0 ? p.images[0].src : '';

    return [
      p.id,
      `"${(p.title || '').replace(/"/g, '""')}"`,
      `"${(p.product_type || '').replace(/"/g, '""')}"`,
      `"${(p.vendor || '').replace(/"/g, '""')}"`,
      p.status,
      `"${(p.tags || '').replace(/"/g, '""')}"`,
      p.variants.length,
      minPrice,
      maxPrice,
      imageUrl,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// ─── Paso 2: Subir CSV a Google Drive ────────────────────────────────────────
async function uploadToDrive(csvPath) {
  console.log('☁️  Subiendo CSV a Google Drive...');

  const credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: CSV_FILENAME,
    parents: [GOOGLE_DRIVE_FOLDER_ID],
  };

  const media = {
    mimeType: 'text/csv',
    body: fs.createReadStream(csvPath),
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id, name',
  });

  console.log(`✅ Archivo subido a Drive: ${file.data.name} (ID: ${file.data.id})`);
  return file.data;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Iniciando backup Shopify - ${today}\n`);

  // Validar que los secrets estén configurados
  const requiredEnvVars = [
    'SHOPIFY_STORE_URL',
    'SHOPIFY_ACCESS_TOKEN',
    'GOOGLE_SERVICE_ACCOUNT_JSON',
    'GOOGLE_DRIVE_FOLDER_ID',
  ];

  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      throw new Error(`❌ Falta la variable de entorno: ${varName}`);
    }
  }

  // Paso 1: Obtener productos
  const products = await fetchShopifyProducts();

  // Generar CSV
  const csv = productsToCSV(products);
  fs.writeFileSync(CSV_PATH, csv, 'utf8');
  console.log(`📄 CSV generado: ${CSV_PATH} (${products.length} productos)`);

  // Paso 2: Subir a Drive
  await uploadToDrive(CSV_PATH);

  // Limpiar archivo temporal
  fs.unlinkSync(CSV_PATH);

  console.log('\n✅ Backup completado exitosamente.\n');
}

main().catch((err) => {
  console.error('\n❌ Error en el backup:', err.message);
  process.exit(1);
});
