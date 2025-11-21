require('dotenv').config();
const mongoose = require('mongoose');

async function exploreDB() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      console.error('❌ MONGODB_URI no está definida en .env');
      process.exit(1);
    }

    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    
    console.log(`\n✅ Conectado a la base de datos: "${dbName}"\n`);
    console.log('='.repeat(60));
    
    // Listar todas las colecciones
    const collections = await db.listCollections().toArray();
    console.log(`\n📦 Colecciones encontradas (${collections.length}):\n`);
    
    for (const collection of collections) {
      const name = collection.name;
      const count = await db.collection(name).countDocuments();
      console.log(`  • ${name}: ${count} documentos`);
    }
    
    console.log('\n' + '='.repeat(60));
    
    // Mostrar detalles de cada colección
    for (const collection of collections) {
      const name = collection.name;
      const count = await db.collection(name).countDocuments();
      
      if (count > 0) {
        console.log(`\n📄 Colección: ${name} (${count} documentos)`);
        console.log('-'.repeat(60));
        
        // Mostrar primeros 3 documentos como ejemplo
        const samples = await db.collection(name).find({}).limit(3).toArray();
        
        samples.forEach((doc, index) => {
          console.log(`\n  Documento ${index + 1}:`);
          // Mostrar solo campos importantes, ocultar tokens/passwords
          const safeDoc = { ...doc };
          if (safeDoc.passwordHash) safeDoc.passwordHash = '[HIDDEN]';
          if (safeDoc.accessToken) safeDoc.accessToken = '[HIDDEN]';
          if (safeDoc.refreshToken) safeDoc.refreshToken = '[HIDDEN]';
          
          console.log(JSON.stringify(safeDoc, null, 4));
        });
        
        if (count > 3) {
          console.log(`\n  ... y ${count - 3} documentos más`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Exploración completada. Base de datos: "${dbName}"\n`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

exploreDB();

