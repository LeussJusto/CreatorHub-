const { validationResult } = require('express-validator');
const axios = require('axios');

// Analiza las métricas y genera recomendaciones usando IA
exports.analyzeMetrics = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { platform, question, metrics, account } = req.body;

    if (!platform || !question) {
      return res.status(400).json({ error: 'Platform y question son requeridos' });
    }

    // Preparar contexto de las métricas
    const context = buildMetricsContext(platform, metrics, account);
    
    // Generar respuesta usando IA (OpenAI si está disponible, sino usar sistema de reglas)
    const response = await generateAIResponse(platform, question, context);

    res.json({ response });
  } catch (error) {
    console.error('AI analyze error:', error);
    res.status(500).json({ error: 'Error al procesar la consulta de IA', details: error.message });
  }
};

// Construye un contexto legible de las métricas
function buildMetricsContext(platform, metrics, account) {
  const context = {
    platform: platform.toLowerCase(),
    accountName: account?.displayName || 'Tu cuenta',
    summary: {},
    details: {}
  };

  if (!metrics) {
    return context;
  }

  switch (platform.toLowerCase()) {
    case 'youtube':
      context.summary = {
        subscribers: metrics.profile?.subscriber_count || metrics.profile?.subscribers || 0,
        views: metrics.profile?.view_count || metrics.profile?.views || 0,
        videos: metrics.profile?.video_count || metrics.videos?.length || 0,
        channelName: account?.displayName || 'Tu canal'
      };
      context.details = {
        videos: metrics.videos || [],
        recentVideos: (metrics.videos || []).slice(0, 5)
      };
      break;

    case 'instagram':
      context.summary = {
        followers: metrics.profile?.follower_count || metrics.profile?.followers || 0,
        posts: metrics.profile?.media_count || metrics.media?.length || 0,
        reach: metrics.profile?.reach || metrics.metricsRaw?.reach || 0,
        username: metrics.profile?.username || account?.displayName
      };
      context.details = {
        media: metrics.media || [],
        recentMedia: (metrics.media || []).slice(0, 5)
      };
      break;

    case 'facebook':
      context.summary = {
        pages: metrics.pages?.length || 0,
        posts: metrics.videos?.length || 0,
        userName: account?.displayName || 'Tu perfil'
      };
      context.details = {
        pages: metrics.pages || [],
        posts: metrics.videos || []
      };
      break;

    case 'tiktok':
      context.summary = {
        followers: metrics.profile?.follower_count || 0,
        likes: metrics.profile?.likes_count || 0,
        videos: metrics.profile?.video_count || metrics.videos?.length || 0,
        displayName: metrics.profile?.display_name || account?.displayName
      };
      context.details = {
        videos: metrics.videos || []
      };
      break;

    case 'twitch':
      context.summary = {
        username: account?.displayName || account?.raw?.display_name || 'Tu canal'
      };
      break;
  }

  return context;
}

// Genera respuesta de IA usando OpenAI o sistema de reglas
async function generateAIResponse(platform, question, context) {
  const questionLower = question.toLowerCase();

  // Si hay OpenAI API key, usar OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateOpenAIResponse(platform, question, context);
    } catch (error) {
      console.warn('OpenAI error, falling back to rules:', error.message);
      // Fallback a sistema de reglas
    }
  }

  // Sistema de reglas basado en análisis de métricas
  return generateRuleBasedResponse(platform, questionLower, context);
}

// Genera respuesta usando OpenAI
async function generateOpenAIResponse(platform, question, context) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) throw new Error('OpenAI API key not configured');

  const systemPrompt = `Eres un asistente experto en análisis de métricas de redes sociales. 
Analiza los datos proporcionados y da recomendaciones específicas y accionables.
Responde siempre en español de manera clara y profesional.
Si no hay suficientes datos, sugiere qué métricas serían útiles.`;

  const userPrompt = `Plataforma: ${platform}
Cuenta: ${context.accountName}

Métricas disponibles:
${JSON.stringify(context.summary, null, 2)}

Pregunta del usuario: ${question}

Analiza las métricas y responde la pregunta del usuario con recomendaciones específicas.`;

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    },
    {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.choices[0]?.message?.content || 'No pude generar una respuesta.';
}

// Genera respuesta basada en reglas (fallback)
function generateRuleBasedResponse(platform, question, context) {
  const { summary } = context;
  const responses = [];

  // Análisis general
  if (question.includes('estadísticas') || question.includes('métricas') || question.includes('cómo están')) {
    responses.push(generateStatsSummary(platform, summary));
  }

  // Recomendaciones
  if (question.includes('recomendación') || question.includes('mejorar') || question.includes('qué puedo')) {
    responses.push(generateRecommendations(platform, summary));
  }

  // Análisis de crecimiento
  if (question.includes('crecimiento') || question.includes('evolución') || question.includes('progreso')) {
    responses.push(generateGrowthAnalysis(platform, summary));
  }

  // Comparación
  if (question.includes('comparar') || question.includes('vs') || question.includes('diferencia')) {
    responses.push(generateComparison(platform, summary));
  }

  // Si no hay match específico, dar análisis general
  if (responses.length === 0) {
    responses.push(generateGeneralAnalysis(platform, summary));
  }

  return responses.join('\n\n');
}

function generateStatsSummary(platform, summary) {
  switch (platform) {
    case 'youtube':
      return `📊 **Resumen de tu canal de YouTube:**

• **Suscriptores:** ${formatNumber(summary.subscribers)}
• **Visualizaciones totales:** ${formatNumber(summary.views)}
• **Videos publicados:** ${formatNumber(summary.videos)}

${summary.subscribers > 1000 
  ? '✅ Tienes una buena base de suscriptores. Continúa creando contenido de calidad.' 
  : '💡 Enfócate en crear contenido consistente para aumentar tus suscriptores.'}`;

    case 'instagram':
      return `📊 **Resumen de tu perfil de Instagram:**

• **Seguidores:** ${formatNumber(summary.followers)}
• **Publicaciones:** ${formatNumber(summary.posts)}
• **Alcance:** ${formatNumber(summary.reach)}

${summary.followers > 1000 
  ? '✅ Tu perfil está creciendo bien. Mantén la consistencia en tus publicaciones.' 
  : '💡 Publica regularmente y usa hashtags relevantes para aumentar tu alcance.'}`;

    case 'tiktok':
      return `📊 **Resumen de tu cuenta de TikTok:**

• **Seguidores:** ${formatNumber(summary.followers)}
• **Likes totales:** ${formatNumber(summary.likes)}
• **Videos:** ${formatNumber(summary.videos)}

${summary.followers > 5000 
  ? '✅ Excelente crecimiento. Sigue creando contenido viral y mantén la frecuencia.' 
  : '💡 Crea videos cortos y atractivos. La consistencia es clave en TikTok.'}`;

    default:
      return `📊 Analizando tus estadísticas de ${platform}...`;
  }
}

function generateRecommendations(platform, summary) {
  const recommendations = [];

  switch (platform) {
    case 'youtube':
      if (summary.subscribers < 1000) {
        recommendations.push('🎯 **Enfócate en SEO:** Usa palabras clave relevantes en títulos y descripciones');
        recommendations.push('📅 **Consistencia:** Publica al menos 1-2 videos por semana');
        recommendations.push('🎬 **Calidad:** Mejora la edición y el audio de tus videos');
      } else if (summary.subscribers < 10000) {
        recommendations.push('🤝 **Colaboraciones:** Trabaja con otros creadores de tu nicho');
        recommendations.push('📊 **Analiza:** Revisa qué videos tienen mejor rendimiento y repite el formato');
        recommendations.push('💬 **Comunidad:** Responde comentarios y crea una comunidad activa');
      } else {
        recommendations.push('🚀 **Diversifica:** Crea series de contenido y contenido de largo formato');
        recommendations.push('💰 **Monetiza:** Explora diferentes fuentes de ingresos');
        recommendations.push('📈 **Optimiza:** Usa YouTube Analytics para identificar tendencias');
      }
      break;

    case 'instagram':
      if (summary.followers < 1000) {
        recommendations.push('📸 **Contenido visual:** Mejora la calidad de tus fotos y videos');
        recommendations.push('#️⃣ **Hashtags:** Usa 20-30 hashtags relevantes por publicación');
        recommendations.push('⏰ **Horarios:** Publica cuando tu audiencia está más activa');
      } else {
        recommendations.push('📱 **Stories:** Usa Stories diariamente para mantener engagement');
        recommendations.push('🎥 **Reels:** Crea Reels para aumentar tu alcance');
        recommendations.push('🤝 **Colaboraciones:** Trabaja con marcas y otros creadores');
      }
      break;

    case 'tiktok':
      recommendations.push('🎵 **Tendencias:** Participa en challenges y tendencias virales');
      recommendations.push('⏱️ **Timing:** Publica 2-3 veces al día en horarios pico');
      recommendations.push('💡 **Creatividad:** Experimenta con diferentes formatos y estilos');
      break;
  }

  return `💡 **Recomendaciones para mejorar en ${platform}:**\n\n${recommendations.map(r => `• ${r}`).join('\n')}`;
}

function generateGrowthAnalysis(platform, summary) {
  switch (platform) {
    case 'youtube':
      const avgViews = summary.views && summary.videos ? Math.round(summary.views / summary.videos) : 0;
      return `📈 **Análisis de crecimiento:**

• Promedio de visualizaciones por video: ${formatNumber(avgViews)}
${avgViews > 1000 
  ? '✅ Tus videos están generando buen engagement. Continúa con este ritmo.' 
  : '💡 Trabaja en mejorar los títulos y thumbnails para aumentar las visualizaciones.'}`;

    case 'instagram':
      const engagementRate = summary.reach && summary.followers 
        ? ((summary.reach / summary.followers) * 100).toFixed(1) 
        : 0;
      return `📈 **Análisis de crecimiento:**

• Tasa de alcance: ${engagementRate}%
${engagementRate > 50 
  ? '✅ Excelente alcance. Tu contenido está llegando bien a tu audiencia.' 
  : '💡 Mejora el engagement respondiendo comentarios y usando Stories.'}`;

    default:
      return `📈 Analizando el crecimiento de tu cuenta...`;
  }
}

function generateComparison(platform, summary) {
  return `📊 **Comparación de métricas:**

Basándome en tus datos actuales, aquí tienes un análisis comparativo:

${platform === 'youtube' 
  ? `• Tienes ${formatNumber(summary.subscribers)} suscriptores y ${formatNumber(summary.videos)} videos
• Esto significa aproximadamente ${summary.videos > 0 ? Math.round(summary.subscribers / summary.videos) : 0} suscriptores por video
• Para crecer, apunta a mejorar este ratio con contenido más atractivo` 
  : 'Analiza tus métricas clave y compáralas con tus objetivos mensuales.'}`;
}

function generateGeneralAnalysis(platform, summary) {
  let analysis = `🤖 **Análisis de tus estadísticas de ${platform}:**\n\n`;
  
  // Análisis específico por plataforma
  switch (platform) {
    case 'youtube':
      const subs = summary.subscribers || 0;
      const views = summary.views || 0;
      const videos = summary.videos || 0;
      
      analysis += `📊 **Estado actual:**\n`;
      analysis += `• Tienes ${formatNumber(subs)} suscriptores\n`;
      analysis += `• ${formatNumber(views)} visualizaciones totales\n`;
      analysis += `• ${formatNumber(videos)} videos publicados\n\n`;
      
      if (videos > 0) {
        const avgViews = Math.round(views / videos);
        analysis += `📈 **Métricas clave:**\n`;
        analysis += `• Promedio de ${formatNumber(avgViews)} visualizaciones por video\n`;
        
        if (avgViews > 1000) {
          analysis += `✅ Excelente rendimiento por video. Tu contenido está resonando bien.\n\n`;
        } else if (avgViews > 500) {
          analysis += `👍 Buen rendimiento. Hay espacio para mejorar con mejor SEO y thumbnails.\n\n`;
        } else {
          analysis += `💡 Oportunidad de mejora. Enfócate en títulos más atractivos y mejor SEO.\n\n`;
        }
      }
      
      if (subs < 1000) {
        analysis += `🎯 **Recomendación principal:**\n`;
        analysis += `Enfócate en crear contenido de valor consistente. Publica al menos 1-2 veces por semana y optimiza tus títulos y descripciones para SEO.\n`;
      } else if (subs < 10000) {
        analysis += `🎯 **Recomendación principal:**\n`;
        analysis += `Estás en buen camino. Considera colaboraciones con otros creadores y analiza qué videos tienen mejor rendimiento para replicar el éxito.\n`;
      } else {
        analysis += `🎯 **Recomendación principal:**\n`;
        analysis += `Excelente crecimiento. Diversifica tu contenido y explora nuevas formas de monetización.\n`;
      }
      break;

    case 'instagram':
      const followers = summary.followers || 0;
      const posts = summary.posts || 0;
      const reach = summary.reach || 0;
      
      analysis += `📊 **Estado actual:**\n`;
      analysis += `• ${formatNumber(followers)} seguidores\n`;
      analysis += `• ${formatNumber(posts)} publicaciones\n`;
      analysis += `• Alcance: ${formatNumber(reach)}\n\n`;
      
      if (followers > 0 && reach > 0) {
        const reachRate = ((reach / followers) * 100).toFixed(1);
        analysis += `📈 **Métricas clave:**\n`;
        analysis += `• Tasa de alcance: ${reachRate}%\n`;
        
        if (parseFloat(reachRate) > 50) {
          analysis += `✅ Excelente alcance. Tu contenido está llegando bien a tu audiencia.\n\n`;
        } else {
          analysis += `💡 Puedes mejorar el alcance usando Stories, Reels y hashtags estratégicos.\n\n`;
        }
      }
      
      analysis += `🎯 **Recomendación principal:**\n`;
      analysis += `Publica contenido visual atractivo regularmente. Usa Stories diariamente y crea Reels para aumentar tu alcance orgánico.\n`;
      break;

    case 'tiktok':
      const tiktokFollowers = summary.followers || 0;
      const tiktokLikes = summary.likes || 0;
      const tiktokVideos = summary.videos || 0;
      
      analysis += `📊 **Estado actual:**\n`;
      analysis += `• ${formatNumber(tiktokFollowers)} seguidores\n`;
      analysis += `• ${formatNumber(tiktokLikes)} likes totales\n`;
      analysis += `• ${formatNumber(tiktokVideos)} videos\n\n`;
      
      if (tiktokVideos > 0) {
        const avgLikes = Math.round(tiktokLikes / tiktokVideos);
        analysis += `📈 **Métricas clave:**\n`;
        analysis += `• Promedio de ${formatNumber(avgLikes)} likes por video\n\n`;
      }
      
      analysis += `🎯 **Recomendación principal:**\n`;
      analysis += `Participa en tendencias virales y publica 2-3 veces al día. Crea contenido corto, atractivo y con música trending.\n`;
      break;

    default:
      analysis += `Basándome en los datos disponibles, puedo ayudarte a entender mejor tu rendimiento.\n\n`;
      analysis += `Puedes preguntarme sobre:\n`;
      analysis += `• Cómo están tus estadísticas\n`;
      analysis += `• Recomendaciones para mejorar\n`;
      analysis += `• Análisis de crecimiento\n`;
      analysis += `• Comparaciones entre períodos\n`;
  }
  
  return analysis;
}

function formatNumber(num) {
  if (num == null || num === undefined) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
}

