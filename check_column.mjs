const { db } = require('./packages/db/src');
async function main() {
  try {
    const result = await db.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'customer_contacts' AND column_name = 'role'");
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
main();
