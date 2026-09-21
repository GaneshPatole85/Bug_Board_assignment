/**
 * BugBoard Database Backup Utility
 * Dumps all collections and index metadata in BSON format compatible with mongodump.
 * Usage: node server/scripts/backup-db.js --uri=<source_uri> --out=<output_dir>
 */
const { MongoClient, BSON } = require('mongodb');
const fs = require('fs');
const path = require('path');

async function main() {
  const args = process.argv.slice(2);
  let uri = '';
  let outDir = '';

  for (const arg of args) {
    if (arg.startsWith('--uri=')) {
      uri = arg.substring(6);
    } else if (arg.startsWith('--out=')) {
      outDir = arg.substring(6);
    }
  }

  if (!uri) {
    console.error('Error: --uri=<source_uri> is required.');
    process.exit(1);
  }

  if (!outDir) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    outDir = path.resolve(__dirname, `../../backups/pre-atlas-migration-${timestamp}`);
  } else {
    outDir = path.resolve(process.cwd(), outDir);
  }

  const dbDir = path.join(outDir, 'bugboard');
  fs.mkdirSync(dbDir, { recursive: true });

  console.log(`[BACKUP] Connecting to source database...`);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();

  const db = client.db();
  console.log(`[BACKUP] Connected. Dumping collections to: ${outDir}`);

  const collections = await db.listCollections().toArray();
  const summary = [];

  for (const colInfo of collections) {
    const colName = colInfo.name;
    if (colName.startsWith('system.')) continue;

    const collection = db.collection(colName);
    const indexes = await collection.indexes();
    const count = await collection.countDocuments();

    const bsonPath = path.join(dbDir, `${colName}.bson`);
    const metaPath = path.join(dbDir, `${colName}.metadata.json`);

    // Write metadata
    const metadata = {
      options: colInfo.options || {},
      indexes: indexes,
      collectionName: colName
    };
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

    // Write BSON stream
    const writeStream = fs.createWriteStream(bsonPath);
    const cursor = collection.find({});
    let dumpedCount = 0;

    for await (const doc of cursor) {
      const buffer = BSON.serialize(doc);
      writeStream.write(buffer);
      dumpedCount++;
    }
    await new Promise((resolve) => writeStream.end(resolve));

    const stats = fs.statSync(bsonPath);
    summary.push({
      collection: colName,
      count: dumpedCount,
      sizeBytes: stats.size,
      indexes: indexes.length
    });

    console.log(`  [✓] Collection: ${colName} -> ${dumpedCount} documents dumped (${stats.size} bytes, ${indexes.length} indexes)`);
  }

  await client.close();

  console.log('\n================ BACKUP SUMMARY ================');
  console.table(summary);
  const totalDocs = summary.reduce((acc, c) => acc + c.count, 0);
  console.log(`Total documents dumped: ${totalDocs}`);
  console.log(`Backup completed successfully at: ${outDir}`);
  console.log('================================================\n');

  if (totalDocs === 0) {
    console.warn('[WARNING] Total documents dumped is 0. Check source database.');
  }
}

main().catch((err) => {
  console.error('[ERROR] Backup failed:', err);
  process.exit(1);
});
