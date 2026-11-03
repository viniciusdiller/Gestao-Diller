import fs from 'node:fs';
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
  console.error('SUPABASE_DB_URL não definida.');
  process.exit(1);
}

async function clean() {
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✓ Conectado ao banco Supabase PostgreSQL.');

    console.log('Limpando tabelas operacionais: installments, sales, clients...');
    await client.query('TRUNCATE TABLE public.installments, public.sales, public.clients CASCADE;');
    console.log('✓ Tabelas truncadas com sucesso!');

    const countRes = await client.query(`
      SELECT 
        (SELECT count(*) FROM public.installments) as installments_count,
        (SELECT count(*) FROM public.sales) as sales_count,
        (SELECT count(*) FROM public.clients) as clients_count
    `);

    console.log('Resultado após limpeza:', countRes.rows[0]);
    console.log('✓ Usuários de autenticação preservados intactos.');
  } catch (err) {
    console.error('Erro ao limpar tabelas:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

clean();
