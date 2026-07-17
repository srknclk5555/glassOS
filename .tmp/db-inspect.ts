import 'dotenv/config';
import { db, users, tenants, roles, materialCategories, productCategories, materials, products, auditLogs } from '../packages/db/src/index.ts';

async function main() {
  console.log('tenants');
  console.log(await db.query.tenants.findMany({ columns:{id:true,name:true,active:true}, limit:20 }));
  console.log('roles');
  console.log(await db.query.roles.findMany({ columns:{id:true,name:true}, limit:20 }));
  console.log('users');
  console.log(await db.query.users.findMany({ columns:{id:true,email:true,roleId:true,tenantId:true,active:true,deletedAt:true}, limit:20 }));
  console.log('materialCats');
  console.log(await db.query.materialCategories.findMany({ columns:{id:true,name:true,tenantId:true}, limit:20 }));
  console.log('productCats');
  console.log(await db.query.productCategories.findMany({ columns:{id:true,name:true,tenantId:true}, limit:20 }));
  console.log('materials');
  console.log(await db.query.materials.findMany({ columns:{id:true,materialCode:true,name:true,tenantId:true,active:true}, limit:20 }));
  console.log('products');
  console.log(await db.query.products.findMany({ columns:{id:true,productCode:true,name:true,tenantId:true,active:true}, limit:20 }));
  console.log('auditLogs');
  console.log(await db.query.auditLogs.findMany({ columns:{id:true,tenantId:true,entityType:true,action:true,createdAt:true}, limit:20 }));
}

main().catch((err) => { console.error(err); process.exit(1); });
