import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('SUPABASE_DB_URL não definida nas variáveis de ambiente.');
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

    const migrationPath = path.resolve('supabase/migrations/20261102_initial_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Aplicando migration...');
    await client.query(sql);
    console.log('✓ Migration 20261102_initial_schema.sql executada com sucesso!');

    // Verificar se as tabelas foram criadas
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('clients', 'sales', 'installments');
    `);
    console.log('Tabelas verificadas:', tablesRes.rows.map(r => r.table_name).join(', '));

    // Tentar consultar configurações de autenticação / JWT se disponíveis
    try {
      const jwtRes = await client.query(`
        SELECT name, decrypted_secret 
        FROM vault.decrypted_secrets 
        WHERE name LIKE '%jwt%' OR name LIKE '%anon%' OR name LIKE '%service%';
      `);
      if (jwtRes.rows.length > 0) {
        console.log('Vault secrets encontrados:', jwtRes.rows.map(r => r.name));
      }
    } catch {
      // Vault pode não ter secrets expostos diretamente
    }

  } catch (err) {
    console.error('Erro na execução da migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
