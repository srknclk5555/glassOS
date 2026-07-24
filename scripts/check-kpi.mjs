import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_ZkChQJ7SW9gu@ep-lingering-scene-asutrdl7-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', { ssl: 'require' });

const result = await sql`
  SELECT 
    status, 
    COUNT(DISTINCT mo.id)::int as order_count, 
    COALESCE(SUM((engine_snapshot->'totals'->>'productionAreaM2')::numeric), 0) as total_area
  FROM manufacturing_orders mo 
  LEFT JOIN manufacturing_order_items moi ON moi.order_id = mo.id 
  WHERE mo.tenant_id = '01KZAYAHZ8DMV29GQY5CKT18FP' AND mo.deleted_at IS NULL 
  GROUP BY status 
  ORDER BY status
`;

console.log('Type of total_area[0]:', typeof result[0]?.total_area);
result.forEach(r => {
  console.log(`status=${r.status}, order_count=${r.order_count}, total_area=${r.total_area}, typeof=${typeof r.total_area}`);
});
console.log('---');
const all = result.reduce((acc, r) => acc + Number(r.total_area), 0);
console.log('Sum (Number):', all);
console.log('Sum (+):', result.reduce((acc, r) => acc + r.total_area, 0));
await sql.end();
