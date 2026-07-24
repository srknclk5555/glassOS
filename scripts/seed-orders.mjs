// GlassOS Test Production Orders Seed
// Creates: recipes, customers, manufacturing orders + items with engine snapshots
import postgres from 'postgres';

const sql = postgres('postgresql://neondb_owner:npg_ZkChQJ7SW9gu@ep-lingering-scene-asutrdl7-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require', { ssl: 'require' });

function makeUlid(seed) {
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const baseTime = 1786000000000 + (seed * 1000);
  let id = '';
  let t = baseTime;
  for (let i = 0; i < 10; i++) {
    id = chars[t % 32] + id;
    t = Math.floor(t / 32);
  }
  for (let i = 0; i < 16; i++) {
    id += chars[(seed * 13 + i * 7) % 32];
  }
  return id;
}

// Reference IDs from seed
const TENANT_ID = '01KZAYAHZ8DMV29GQY5CKT18FP';
const FACTORY_ID = '01KZAYAJYGT18FPX4BJS07ENW3';
const ADMIN_USER_ID = '01KZAYAKW2SC0ZVQBVGFKQ0MQ8';

// Existing customers
const CUSTOMER_A = '00MRRO1532RW8357CCAZG7A48N'; // Test Müşteri A.Ş.
const CUSTOMER_B = '00MRRO4PZG71C28WPVEG6Q40FE'; // serkan cam balkon

async function main() {
  console.log('=== GlassOS Test Production Orders Seed ===\n');

  // Step 1: Create additional customers
  console.log('--- Customers ---');
  const customers = [
    { id: makeUlid(100), code: 'Mob-001', name: 'Mobilya Cam San. A.Ş.' },
    { id: makeUlid(101), code: 'Penc-002', name: 'Pencerem PVC Ltd. Şti.' },
    { id: makeUlid(102), code: 'Dek-003', name: 'Dekoratif Cam Tic. A.Ş.' },
  ];

  for (const c of customers) {
    await sql`
      INSERT INTO customers (id, tenant_id, customer_code, name, is_active, created_at, updated_at)
      VALUES (${c.id}, ${TENANT_ID}, ${c.code}, ${c.name}, true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;
    console.log(`  CUSTOMER: ${c.id}  ${c.name}`);
  }

  // Step 2: Create recipes
  console.log('\n--- Recipes ---');
  const recipeDefs = [
    { id: makeUlid(200), code: '8MM-FUME-TEMP', name: '8mm Füme Temperli Cam', productType: 'tempered', version: 1 },
    { id: makeUlid(201), code: '6MM-SEFFAF-TEMP', name: '6mm Şeffaf Temperli Cam', productType: 'tempered', version: 1 },
    { id: makeUlid(202), code: '10MM-BRONZ-TEMP', name: '10mm Bronz Temperli Cam', productType: 'tempered', version: 1 },
    { id: makeUlid(203), code: 'LAMINE-6MM', name: '6+6 Lamine Cam', productType: 'laminated', version: 1 },
    { id: makeUlid(204), code: 'ISICAM-4-12-4', name: '4+12+4 Isıcam', productType: 'insulated', version: 1 },
    { id: makeUlid(205), code: '12MM-FUME-TEMP', name: '12mm Füme Temperli Cam', productType: 'tempered', version: 1 },
    { id: makeUlid(206), code: 'LAKLI-6MM', name: '6mm Laklı Cam', productType: 'lacquered', version: 1 },
    { id: makeUlid(207), code: 'MAVI-6MM-TEMP', name: '6mm Mavi Temperli Cam', productType: 'tempered', version: 1 },
    { id: makeUlid(208), code: 'YESIL-8MM-TEMP', name: '8mm Yeşil Temperli Cam', productType: 'tempered', version: 1 },
    { id: makeUlid(209), code: 'AYNA-5MM', name: '5mm Aynalı Cam', productType: 'mirror', version: 1 },
  ];

  for (const r of recipeDefs) {
    await sql`
      INSERT INTO recipes (id, tenant_id, recipe_code, name, product_type, version, is_active, created_at, updated_at)
      VALUES (${r.id}, ${TENANT_ID}, ${r.code}, ${r.name}, ${r.productType}, ${r.version}, true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `;
    console.log(`  RECIPE: ${r.id}  ${r.code} — ${r.name}`);
  }

  // Step 3: Create Production Orders
  console.log('\n--- Manufacturing Orders ---');

  // order definitions: [idSeed, orderNo, customerId, customerName, status, productionDate, dueDate, notes]
  const orderDefs = [
    { seed: 300, no: 'MO-2026-0001', custId: CUSTOMER_A, custName: 'Test Müşteri A.Ş.', status: 'released', prodDate: '2026-07-20', dueDate: '2026-07-22', notes: 'Acil teslimat' },
    { seed: 301, no: 'MO-2026-0002', custId: CUSTOMER_B, custName: 'serkan cam balkon', status: 'released', prodDate: '2026-07-20', dueDate: '2026-07-21', notes: 'Balkon camları' },
    { seed: 302, no: 'MO-2026-0003', custId: customers[0].id, custName: 'Mobilya Cam San. A.Ş.', status: 'released', prodDate: '2026-07-20', dueDate: '2026-07-25', notes: 'Vitrin camları' },
    { seed: 303, no: 'MO-2026-0004', custId: customers[1].id, custName: 'Pencerem PVC Ltd. Şti.', status: 'draft', prodDate: '2026-07-21', dueDate: '2026-07-28', notes: '' },
    { seed: 304, no: 'MO-2026-0005', custId: customers[2].id, custName: 'Dekoratif Cam Tic. A.Ş.', status: 'ready', prodDate: '2026-07-21', dueDate: '2026-07-26', notes: 'Dekoratif panel' },
    { seed: 305, no: 'MO-2026-0006', custId: CUSTOMER_A, custName: 'Test Müşteri A.Ş.', status: 'released', prodDate: '2026-07-20', dueDate: '2026-07-23', notes: '' },
    { seed: 306, no: 'MO-2026-0007', custId: customers[0].id, custName: 'Mobilya Cam San. A.Ş.', status: 'ready', prodDate: '2026-07-22', dueDate: '2026-07-27', notes: 'Masa üstü camları' },
    { seed: 307, no: 'MO-2026-0008', custId: CUSTOMER_B, custName: 'serkan cam balkon', status: 'cancelled', prodDate: '2026-07-18', dueDate: '2026-07-20', notes: 'Müşteri iptal etti' },
    { seed: 308, no: 'MO-2026-0009', custId: customers[1].id, custName: 'Pencerem PVC Ltd. Şti.', status: 'draft', prodDate: '2026-07-23', dueDate: '2026-07-30', notes: 'Standart pencere' },
    { seed: 309, no: 'MO-2026-0010', custId: customers[2].id, custName: 'Dekoratif Cam Tic. A.Ş.', status: 'released', prodDate: '2026-07-20', dueDate: '2026-07-24', notes: 'Mağaza vitrini' },
    { seed: 310, no: 'MO-2026-0011', custId: CUSTOMER_A, custName: 'Test Müşteri A.Ş.', status: 'ready', prodDate: '2026-07-22', dueDate: '2026-07-29', notes: 'Ofis bölme camları' },
    { seed: 311, no: 'MO-2026-0012', custId: customers[0].id, custName: 'Mobilya Cam San. A.Ş.', status: 'released', prodDate: '2026-07-20', dueDate: '2026-07-22', notes: 'Acil - Dolap kapakları' },
    { seed: 312, no: 'MO-2026-0013', custId: customers[1].id, custName: 'Pencerem PVC Ltd. Şti.', status: 'draft', prodDate: '2026-07-24', dueDate: '2026-07-31', notes: '' },
    { seed: 313, no: 'MO-2026-0014', custId: CUSTOMER_B, custName: 'serkan cam balkon', status: 'cancelled', prodDate: '2026-07-19', dueDate: '2026-07-21', notes: 'Ölçü hatası' },
    { seed: 314, no: 'MO-2026-0015', custId: customers[2].id, custName: 'Dekoratif Cam Tic. A.Ş.', status: 'released', prodDate: '2026-07-20', dueDate: '2026-07-25', notes: 'Raf camları' },
    { seed: 315, no: 'MO-2026-0016', custId: CUSTOMER_A, custName: 'Test Müşteri A.Ş.', status: 'ready', prodDate: '2026-07-23', dueDate: '2026-07-28', notes: 'Isıcam siparişi' },
    { seed: 316, no: 'MO-2026-0017', custId: customers[0].id, custName: 'Mobilya Cam San. A.Ş.', status: 'draft', prodDate: '2026-07-25', dueDate: '2026-08-01', notes: 'Lamine cam siparişi' },
    { seed: 317, no: 'MO-2026-0018', custId: CUSTOMER_B, custName: 'serkan cam balkon', status: 'released', prodDate: '2026-07-20', dueDate: '2026-07-23', notes: 'Korkuluk camları' },
    { seed: 318, no: 'MO-2026-0019', custId: customers[1].id, custName: 'Pencerem PVC Ltd. Şti.', status: 'cancelled', prodDate: '2026-07-17', dueDate: '2026-07-19', notes: 'Sevkiyat sorunu' },
    { seed: 319, no: 'MO-2026-0020', custId: customers[2].id, custName: 'Dekoratif Cam Tic. A.Ş.', status: 'released', prodDate: '2026-07-20', dueDate: '2026-07-26', notes: 'Akvaryum camları' },
  ];

  const orderIds = [];
  for (const o of orderDefs) {
    const id = makeUlid(o.seed);
    orderIds.push(id);
    await sql`
      INSERT INTO manufacturing_orders (
        id, tenant_id, factory_id, order_no, customer_id, customer_name,
        production_date, due_date, status, notes, is_active,
        created_at, updated_at, created_by
      ) VALUES (
        ${id}, ${TENANT_ID}, ${FACTORY_ID}, ${o.no}, ${o.custId}, ${o.custName},
        ${o.prodDate}::timestamptz, ${o.dueDate}::timestamptz,
        ${o.status}, ${o.notes}, true, NOW(), NOW(), ${ADMIN_USER_ID}
      )
    `;
    console.log(`  ORDER: ${id}  ${o.no}  [${o.status}]  ${o.custName}`);
  }

  // Step 4: Create Order Items with engine snapshots
  console.log('\n--- Manufacturing Order Items ---');

  // Item definitions per order: [orderIndex, recipeIndex, qty, widthMm, heightMm, sequence]
  // Each order gets 1-4 items with realistic dimensions
  const orderItems = [
    // MO-2026-0001 (released) - 8mm Füme Temper - 2 items
    { orderIdx: 0, recipeIdx: 0, qty: 5, w: 1200, h: 1800, seq: 1 },
    { orderIdx: 0, recipeIdx: 0, qty: 3, w: 900, h: 2100, seq: 2 },
    // MO-2026-0002 (released) - 6mm Şeffaf Temper - 3 items
    { orderIdx: 1, recipeIdx: 1, qty: 8, w: 800, h: 1500, seq: 1 },
    { orderIdx: 1, recipeIdx: 1, qty: 4, w: 600, h: 1200, seq: 2 },
    { orderIdx: 1, recipeIdx: 1, qty: 6, w: 1000, h: 2000, seq: 3 },
    // MO-2026-0003 (released) - 10mm Bronz Temper
    { orderIdx: 2, recipeIdx: 2, qty: 10, w: 1500, h: 2500, seq: 1 },
    { orderIdx: 2, recipeIdx: 2, qty: 5, w: 1200, h: 1800, seq: 2 },
    // MO-2026-0004 (draft) - Lamine Cam
    { orderIdx: 3, recipeIdx: 3, qty: 6, w: 1000, h: 1600, seq: 1 },
    // MO-2026-0005 (ready) - Isıcam
    { orderIdx: 4, recipeIdx: 4, qty: 12, w: 700, h: 1400, seq: 1 },
    { orderIdx: 4, recipeIdx: 4, qty: 8, w: 900, h: 1500, seq: 2 },
    // MO-2026-0006 (released) - 12mm Füme Temper
    { orderIdx: 5, recipeIdx: 5, qty: 4, w: 2000, h: 3000, seq: 1 },
    // MO-2026-0007 (ready) - Laklı Cam
    { orderIdx: 6, recipeIdx: 6, qty: 15, w: 500, h: 500, seq: 1 },
    { orderIdx: 6, recipeIdx: 6, qty: 10, w: 600, h: 800, seq: 2 },
    // MO-2026-0008 (cancelled) - Mavi Temper
    { orderIdx: 7, recipeIdx: 7, qty: 3, w: 1000, h: 2000, seq: 1 },
    // MO-2026-0009 (draft) - Yeşil Temper
    { orderIdx: 8, recipeIdx: 8, qty: 7, w: 1100, h: 1700, seq: 1 },
    { orderIdx: 8, recipeIdx: 8, qty: 5, w: 1300, h: 1900, seq: 2 },
    // MO-2026-0010 (released) - Ayna
    { orderIdx: 9, recipeIdx: 9, qty: 8, w: 800, h: 1600, seq: 1 },
    // MO-2026-0011 (ready) - 8mm Füme Temper
    { orderIdx: 10, recipeIdx: 0, qty: 6, w: 1200, h: 2000, seq: 1 },
    { orderIdx: 10, recipeIdx: 0, qty: 4, w: 900, h: 1800, seq: 2 },
    // MO-2026-0012 (released) - 6mm Şeffaf Temper
    { orderIdx: 11, recipeIdx: 1, qty: 20, w: 400, h: 600, seq: 1 },
    // MO-2026-0013 (draft) - Lamine Cam
    { orderIdx: 12, recipeIdx: 3, qty: 8, w: 1200, h: 2400, seq: 1 },
    // MO-2026-0014 (cancelled) - Isıcam
    { orderIdx: 13, recipeIdx: 4, qty: 10, w: 1000, h: 1500, seq: 1 },
    // MO-2026-0015 (released) - 10mm Bronz Temper
    { orderIdx: 14, recipeIdx: 2, qty: 4, w: 1800, h: 2800, seq: 1 },
    { orderIdx: 14, recipeIdx: 2, qty: 6, w: 1500, h: 2200, seq: 2 },
    // MO-2026-0016 (ready) - Isıcam
    { orderIdx: 15, recipeIdx: 4, qty: 14, w: 600, h: 900, seq: 1 },
    // MO-2026-0017 (draft) - Lamine Cam
    { orderIdx: 16, recipeIdx: 3, qty: 5, w: 1500, h: 2000, seq: 1 },
    // MO-2026-0018 (released) - 6mm Mavi Temper
    { orderIdx: 17, recipeIdx: 7, qty: 10, w: 900, h: 2100, seq: 1 },
    // MO-2026-0019 (cancelled) - 12mm Füme
    { orderIdx: 18, recipeIdx: 5, qty: 2, w: 2500, h: 3200, seq: 1 },
    // MO-2026-0020 (released) - 8mm Yeşil
    { orderIdx: 19, recipeIdx: 8, qty: 6, w: 1400, h: 2000, seq: 1 },
    { orderIdx: 19, recipeIdx: 8, qty: 4, w: 1000, h: 1500, seq: 2 },
  ];

  for (const [i, item] of orderItems.entries()) {
    const orderId = orderIds[item.orderIdx];
    const recipe = recipeDefs[item.recipeIdx];
    const itemId = makeUlid(400 + i);

    // Calculate realistic m² values
    const netAreaM2 = (item.w * item.h * item.qty) / 1000000;
    const wasteFactor = 1 + (0.05 + Math.random() * 0.10); // 5-15% waste
    const productionAreaM2 = netAreaM2 * wasteFactor;
    const totalGlassConsumptionM2 = productionAreaM2 * (1 + (0.02 + Math.random() * 0.05)); // 2-7% additional

    // Fire rate varies by product type
    let fireRate = (2 + Math.random() * 5) / 100; // 2-7%
    if (recipe.productType === 'laminated') fireRate = (3 + Math.random() * 4) / 100;
    if (recipe.productType === 'insulated') fireRate = (1 + Math.random() * 3) / 100;

    const engineSnapshot = {
      dimensions: {
        widthMm: item.w,
        heightMm: item.h,
        quantity: item.qty,
        netAreaM2: Math.round(netAreaM2 * 100) / 100,
        productionAreaM2: Math.round(productionAreaM2 * 100) / 100,
      },
      totals: {
        netAreaM2: Math.round(netAreaM2 * 100) / 100,
        productionAreaM2: Math.round(productionAreaM2 * 100) / 100,
        totalGlassConsumptionM2: Math.round(totalGlassConsumptionM2 * 100) / 100,
        fireRateM2: Math.round(fireRate * 10000) / 100,
      },
      layers: [
        {
          material: recipe.name,
          thicknessMm: parseInt(recipe.code.split('MM')[0]) || 6,
          netAreaM2: Math.round(netAreaM2 * 100) / 100,
          productionAreaM2: Math.round(productionAreaM2 * 100) / 100,
        },
      ],
      calculatedAt: new Date().toISOString(),
      engineVersion: '2.1.0',
    };

    await sql`
      INSERT INTO manufacturing_order_items (
        id, order_id, recipe_id, recipe_code, recipe_name,
        net_width_mm, net_height_mm, quantity, engine_snapshot, sequence,
        created_at, updated_at
      ) VALUES (
        ${itemId}, ${orderId}, ${recipe.id}, ${recipe.code}, ${recipe.name},
        ${item.w}, ${item.h}, ${item.qty}, ${engineSnapshot}, ${item.seq},
        NOW(), NOW()
      )
    `;

    if (i % 5 === 0) {
      console.log(`  ITEM ${i + 1}/${orderItems.length}: ${itemId}  ${recipe.code} x${item.qty}  ${Math.round(productionAreaM2 * 100) / 100} m²`);
    }
  }

  console.log(`\n  Total items created: ${orderItems.length}`);

  // Step 5: Verify
  console.log('\n--- Verification ---');
  const orderCount = await sql`SELECT COUNT(*)::int as cnt FROM manufacturing_orders WHERE tenant_id = ${TENANT_ID}`;
  const itemCount = await sql`SELECT COUNT(*)::int as cnt FROM manufacturing_order_items`;
  const statusCounts = await sql`
    SELECT status, COUNT(*)::int as cnt 
    FROM manufacturing_orders 
    WHERE tenant_id = ${TENANT_ID} AND deleted_at IS NULL
    GROUP BY status ORDER BY status
  `;
  const totalArea = await sql`
    SELECT COALESCE(SUM((engine_snapshot->'totals'->>'productionAreaM2')::numeric), 0) as total
    FROM manufacturing_order_items
  `;

  console.log(`  Total Orders: ${orderCount[0].cnt}`);
  console.log(`  Total Items: ${itemCount[0].cnt}`);
  console.log('  By Status:', JSON.stringify(statusCounts));
  console.log(`  Total Production Area: ${Math.round(Number(totalArea[0].total) * 100) / 100} m²`);

  await sql.end();
  console.log('\n=== Seed completed successfully ===');
}

main().catch(e => { console.error('SEED ERROR:', e); process.exit(1); });
