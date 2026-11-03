import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

let dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl && fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const match = envContent.match(/SUPABASE_DB_URL=([^\r\n]+)/);
  if (match) {
    dbUrl = match[1].trim();
  }
}

if (!dbUrl) {
  console.error('SUPABASE_DB_URL não definida nas variáveis de ambiente nem no .env.local.');
  process.exit(1);
}

async function run() {
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✓ Conectado ao banco Supabase PostgreSQL com sucesso!');

    const migrationsDir = path.resolve('supabase/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Encontradas ${files.length} migrations:`, files);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Aplicando ${file}...`);
      await client.query(sql);
      console.log(`✓ ${file} executada com sucesso!`);
    }

    // Recarregar cache de schema do PostgREST
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('✓ PostgREST schema cache reloaded!');

    // Inspecionar colunas de installments
    const columnsRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'installments'
      ORDER BY ordinal_position;
    `);

    console.log('\nColunas atuais da tabela installments:');
    columnsRes.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));

  } catch (err) {
    console.error('Erro na execução da migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
