require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function checkUser() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    const uri = process.env.MONGODB_URI;
    
    if (!uri) {
      console.error('❌ MONGODB_URI no está definida en .env');
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('✅ Conectado a MongoDB\n');
    
    // Email puede venir como argumento de línea de comandos o usar variable de entorno
    const email = process.argv[2] || process.env.CHECK_USER_EMAIL || '';
    
    if (!email) {
      console.log('💡 Uso: node check-user.js <email>');
      console.log('   O define CHECK_USER_EMAIL en .env\n');
      console.log('📊 Mostrando todos los usuarios (primeros 10):\n');
      
      const allUsers = await User.find({}).select('name email createdAt').limit(10);
      if (allUsers.length === 0) {
        console.log('   No hay usuarios registrados');
      } else {
        allUsers.forEach((u, i) => {
          console.log(`${i + 1}. ${u.email} - ${u.name || 'Sin nombre'} (${u.createdAt.toLocaleDateString()})`);
        });
      }
      await mongoose.disconnect();
      process.exit(0);
    }
    
    console.log(`🔍 Buscando usuario con email: ${email}\n`);
    
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (user) {
      console.log('✅ ¡Usuario encontrado!\n');
      console.log('='.repeat(60));
      console.log('📋 Datos del usuario:');
      console.log('='.repeat(60));
      console.log(`ID: ${user._id}`);
      console.log(`Nombre: ${user.name || 'No especificado'}`);
      console.log(`Email: ${user.email}`);
      console.log(`Contraseña: [HASHED - ${user.passwordHash ? 'Sí tiene' : 'No tiene'}]`);
      console.log(`Avatar: ${user.avatarUrl || 'No tiene'}`);
      console.log(`Creado: ${user.createdAt}`);
      console.log(`Actualizado: ${user.updatedAt}`);
      console.log('='.repeat(60));
    } else {
      console.log('❌ Usuario NO encontrado');
      console.log('\n💡 Posibles razones:');
      console.log('   - El email no coincide exactamente');
      console.log('   - El usuario no se ha registrado aún');
      console.log('   - Hay un error en la conexión a la BD\n');
      
      // Mostrar todos los usuarios para verificar
      const allUsers = await User.find({}).select('name email createdAt').limit(10);
      console.log(`\n📊 Usuarios en la base de datos (mostrando primeros 10):`);
      console.log('-'.repeat(60));
      if (allUsers.length === 0) {
        console.log('   No hay usuarios registrados');
      } else {
        allUsers.forEach((u, i) => {
          console.log(`${i + 1}. ${u.email} - ${u.name || 'Sin nombre'} (Creado: ${u.createdAt})`);
        });
      }
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Desconectado de MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUser();

