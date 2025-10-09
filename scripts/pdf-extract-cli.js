#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { Blob } = require('buffer');

async function main() {
  const args = process.argv.slice(2);
  const fileArgIndex = args.findIndex(a => a === '--file');
  const urlArgIndex = args.findIndex(a => a === '--url');

  const filePath = fileArgIndex !== -1 ? args[fileArgIndex + 1] : null;
  const url = urlArgIndex !== -1 ? args[urlArgIndex + 1] : 'http://localhost:3000/api/pdf-extract';

  if (!filePath) {
    console.error('Usage: node scripts\\pdf-extract-cli.js --file C:\\path\\to\\file.pdf [--url http://localhost:3000/api/pdf-extract]');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log('CLI: Posting PDF for extraction...');
  console.log('Target URL:', url);
  console.log('PDF Path:', filePath);

  const buf = fs.readFileSync(filePath);
  const blob = new Blob([buf], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('pdf', blob, path.basename(filePath));

  const res = await fetch(url, { method: 'POST', body: formData });
  console.log('Response status:', res.status, res.statusText);

  const json = await res.json().catch(() => null);
  if (!json) {
    console.error('Failed to parse response JSON.');
    process.exit(1);
  }

  const products = Array.isArray(json.products) ? json.products : [];
  console.log('Products parsed:', products.length);

  products.slice(0, 10).forEach((p, i) => {
    console.log(`${i + 1}. ${p.name} | qty=${p.quantity} | TTC=${p.priceTTC ?? 'n/a'} | HT=${p.priceHT ?? 'n/a'} | ref=${p.reference ?? 'n/a'}`);
  });

  if (products.length === 0 && json.positions) {
    const pages = json.positions || [];
    const itemCount = pages.reduce((acc, p) => acc + (p.items?.length || 0), 0);
    console.log(`No products found. Positions returned: pages=${pages.length}, items=${itemCount}`);
  }
}

main().catch((e) => {
  console.error('CLI error:', e);
  process.exit(1);
});