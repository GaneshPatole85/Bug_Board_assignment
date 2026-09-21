/**
 * BugBoard Database Restore Utility
 * Restores all collections and index metadata from a BSON backup directory to MongoDB Atlas.
 * Usage: node server/scripts/restore-db.cjs --uri=<target_uri> --dir=<backup_dir> [--drop]
 */
const { MongoClient, BSON } = require('mongodb');
const fs = require('fs');
const path = require('path');

function readBsonFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const docs = [];
  let offset = 0;

  while (offset < fileBuffer.length) {
    if (offset + 4 > fileBuffer.length) break;
    const docSize = fileBuffer.readInt32LE(offset);
    if (docSize <= 0 || offset + docSize > fileBuffer.length) {
      throw new Error(`Corrupted BSON stream at offset ${offset}`);
    }
    const docBuffer = fileBuffer.subarray(offset, offset + docSize);
    const doc = BSON.deserialize(docBuffer);
    docs.push(doc);
    offset += docSize;
  }

  return docs;
}

async function main() {
  const args = process.argv.slice(2);
  let uri = '';
  let backupDir = '';
  let dropExisting = false;

  for (const arg of args) {
    if (arg.startsWith('--uri=')) {
      uri = arg.substring(6);
    } else if (arg.startsWith('--dir=')) {
      backupDir = arg.substring(6);
    } else if (arg === '--drop') {
      dropExisting = true;
    }
  }

  if (!uri) {
    const dotenvPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(dotenvPath)) {
      require('dotenv').config({ path: dotenvPath });
      uri = process.env.MONGODB_URI;
    }
  }

  if (!uri || !backupDir) {
    console.error('Error: --uri=<target_uri> (or MONGODB_URI in server/.env) and --dir=<backup_dir> are required.');
    process.exit(1);
  }

  const resolvedDir = path.resolve(process.cwd(), backupDir);
  const searchDir = fs.existsSync(path.join(resolvedDir, 'bugboard'))
    ? path.join(resolvedDir, 'bugboard')
    : resolvedDir;

  if (!fs.existsSync(searchDir)) {
    console.error(`Error: Directory not found: ${searchDir}`);
    process.exit(1);
  }

  console.log(`[RESTORE] Connecting to target database...`);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await client.connect();

  const db = client.db();
  console.log(`[RESTORE] Connected to database: "${db.databaseName}".`);

  const files = fs.readdirSync(searchDir);
  const bsonFiles = files.filter(f => f.endsWith('.bson'));
  const summary = [];

  for (const bsonFile of bsonFiles) {
    const colName = path.basename(bsonFile, '.bson');
    const bsonPath = path.join(searchDir, bsonFile);
    const metaPath = path.join(searchDir, `${colName}.metadata.json`);

    const collection = db.collection(colName);

    if (dropExisting) {
      try {
        await collection.drop();
      } catch (err) {
        // Ignore NamespaceNotFound
      }
    }

    // Read and restore documents
    const docs = readBsonFile(bsonPath);
    let insertedCount = 0;
    if (docs.length > 0) {
      const result = await collection.insertMany(docs, { ordered: true });
      insertedCount = result.insertedCount;
    }

    // Restore indexes from metadata
    let restoredIndexes = 0;
    if (fs.existsSync(metaPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        if (Array.isArray(metadata.indexes)) {
          for (const idx of metadata.indexes) {
            if (idx.name === '_id_') continue; // Default index already exists
            const { key, name, unique, sparse, expireAfterSeconds, weights, default_language } = idx;
            const options = { name };
            if (unique) options.unique = true;
            if (sparse) options.sparse = true;
            if (expireAfterSeconds !== undefined) options.expireAfterSeconds = expireAfterSeconds;
            if (weights) options.weights = weights;
            if (default_language) options.default_language = default_language;

            await collection.createIndex(key, options);
            restoredIndexes++;
          }
        }
      } catch (idxErr) {
        console.warn(`  [!] Warning restoring indexes for ${colName}:`, idxErr.message);
      }
    }

    const currentIdxCount = (await collection.indexes()).length;

    summary.push({
      collection: colName,
      restoredDocs: insertedCount,
      restoredIndexes: restoredIndexes,
      totalIndexesOnDb: currentIdxCount
    });

    console.log(`  [✓] Restored ${colName}: ${insertedCount} docs, ${restoredIndexes} indexes created (Total on Atlas: ${currentIdxCount})`);
  }

  await client.close();

  console.log('\n================ RESTORE SUMMARY ================');
  console.table(summary);
  const totalRestored = summary.reduce((acc, c) => acc + c.restoredDocs, 0);
  console.log(`Total documents restored to Atlas: ${totalRestored}`);
  console.log('================================================\n');
}

main().catch((err) => {
  console.error('[ERROR] Restore failed:', err);
  process.exit(1);
});
