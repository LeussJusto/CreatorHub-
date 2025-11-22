// Validación de variables de entorno críticas
function validateEnv() {
  const errors = [];
  const warnings = [];

  // Variables críticas (la app no funciona sin estas)
  const required = {
    MONGODB_URI: 'URI de conexión a MongoDB',
    JWT_SECRET: 'Secreto para firmar tokens JWT (debe ser una cadena aleatoria segura)',
  };

  // Variables de OAuth (opcionales pero recomendadas)
  const oauthPlatforms = {
    youtube: {
      YT_CLIENT_ID: 'Client ID de Google OAuth para YouTube',
      YT_CLIENT_SECRET: 'Client Secret de Google OAuth para YouTube',
    },
    instagram: {
      FACEBOOK_APP_ID: 'App ID de Facebook (para Instagram Business)',
      FACEBOOK_APP_SECRET: 'App Secret de Facebook (para Instagram Business)',
    },
    tiktok: {
      TIKTOK_CLIENT_KEY: 'Client Key de TikTok Developer',
      TIKTOK_CLIENT_SECRET: 'Client Secret de TikTok Developer',
    },
    twitch: {
      TWICH_CLIENT_KEY: 'Client ID de Twitch',
      TWICH_CLIENT_SECRET: 'Client Secret de Twitch',
    },
    facebook: {
      FACEBOOK_APP_ID: 'App ID de Facebook',
      FACEBOOK_APP_SECRET: 'App Secret de Facebook',
    },
  };

  // Validar variables críticas
  for (const [key, description] of Object.entries(required)) {
    if (!process.env[key]) {
      errors.push(`❌ ${key}: ${description}`);
    }
  }

  // Validar variables de OAuth (solo advertencias, no bloquean)
  for (const [platform, vars] of Object.entries(oauthPlatforms)) {
    const hasAll = Object.keys(vars).every(key => process.env[key]);
    const hasSome = Object.keys(vars).some(key => process.env[key]);
    
    if (!hasAll && hasSome) {
      warnings.push(`⚠️  ${platform.toUpperCase()}: Tienes algunas credenciales pero faltan otras. La integración puede no funcionar.`);
    } else if (!hasAll) {
      warnings.push(`ℹ️  ${platform.toUpperCase()}: No configurado (opcional)`);
    }
  }

  // Validar URLs de producción
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.BACKEND_URL) {
      errors.push('❌ BACKEND_URL: Requerido en producción (ej: https://api.creatorhub.com)');
    }
    if (!process.env.CLIENT_ORIGIN) {
      errors.push('❌ CLIENT_ORIGIN: Requerido en producción (ej: https://creatorhub.com)');
    }
    
    // Validar que las URLs sean HTTPS en producción
    if (process.env.BACKEND_URL && !process.env.BACKEND_URL.startsWith('https://')) {
      warnings.push('⚠️  BACKEND_URL debería usar HTTPS en producción');
    }
    if (process.env.CLIENT_ORIGIN && !process.env.CLIENT_ORIGIN.startsWith('https://')) {
      warnings.push('⚠️  CLIENT_ORIGIN debería usar HTTPS en producción');
    }
  }

  // Mostrar errores y advertencias
  if (errors.length > 0) {
    console.error('\n🚨 ERRORES DE CONFIGURACIÓN:\n');
    errors.forEach(err => console.error(err));
    console.error('\n💡 Configura estas variables en tu archivo .env\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  ADVERTENCIAS:\n');
    warnings.forEach(warn => console.warn(warn));
    console.warn('');
  }

  // Mostrar resumen de integraciones configuradas
  const configuredPlatforms = Object.keys(oauthPlatforms).filter(platform => {
    const vars = oauthPlatforms[platform];
    return Object.keys(vars).every(key => process.env[key]);
  });

  if (configuredPlatforms.length > 0) {
    console.log(`✅ Integraciones configuradas: ${configuredPlatforms.join(', ').toUpperCase()}\n`);
  }
}

module.exports = { validateEnv };

