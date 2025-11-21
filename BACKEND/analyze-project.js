require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Project = require('./src/models/Project');
const Task = require('./src/models/Task');
const Event = require('./src/models/Event');
const Script = require('./src/models/Script');
const IntegrationAccount = require('./src/models/IntegrationAccount');
const SocialMetric = require('./src/models/SocialMetric');
const Notification = require('./src/models/Notification');

async function analyzeProject() {
  try {
    console.log('🔌 Conectando a MongoDB...\n');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');
    console.log('='.repeat(70));
    console.log('📊 ANÁLISIS COMPLETO DEL PROYECTO CREATORHUB');
    console.log('='.repeat(70));
    
    // 1. USUARIOS
    const users = await User.find({}).select('name email createdAt').limit(5);
    const totalUsers = await User.countDocuments();
    console.log(`\n👥 USUARIOS (Total: ${totalUsers})`);
    console.log('-'.repeat(70));
    if (users.length > 0) {
      users.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.email} - "${u.name || 'Sin nombre'}" (${u.createdAt.toLocaleDateString()})`);
      });
      if (totalUsers > 5) console.log(`  ... y ${totalUsers - 5} usuarios más`);
    } else {
      console.log('  No hay usuarios registrados');
    }
    
    // 2. PROYECTOS
    const projects = await Project.find({}).populate('members.user', 'name email').limit(5);
    const totalProjects = await Project.countDocuments();
    console.log(`\n📁 PROYECTOS (Total: ${totalProjects})`);
    console.log('-'.repeat(70));
    if (projects.length > 0) {
      projects.forEach((p, i) => {
        const platforms = p.platforms && p.platforms.length > 0 ? p.platforms.join(', ') : 'Sin plataformas';
        const members = p.members ? p.members.length : 0;
        console.log(`  ${i + 1}. "${p.name}"`);
        console.log(`     Estado: ${p.status} | Plataformas: ${platforms}`);
        console.log(`     Miembros: ${members} | Creado: ${p.createdAt.toLocaleDateString()}`);
        if (p.description) console.log(`     Descripción: ${p.description.substring(0, 50)}...`);
      });
      if (totalProjects > 5) console.log(`  ... y ${totalProjects - 5} proyectos más`);
    } else {
      console.log('  No hay proyectos creados');
    }
    
    // 3. TAREAS
    const tasks = await Task.find({}).populate('project', 'name').populate('assignees', 'name email').limit(5);
    const totalTasks = await Task.countDocuments();
    const tasksByStatus = await Task.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log(`\n✅ TAREAS (Total: ${totalTasks})`);
    console.log('-'.repeat(70));
    if (tasksByStatus.length > 0) {
      tasksByStatus.forEach(s => {
        console.log(`  ${s._id || 'sin estado'}: ${s.count} tareas`);
      });
    }
    if (tasks.length > 0) {
      console.log('\n  Ejemplos:');
      tasks.forEach((t, i) => {
        const projectName = t.project && t.project.name ? t.project.name : 'Proyecto eliminado';
        console.log(`  ${i + 1}. "${t.title}" - ${projectName}`);
        console.log(`     Estado: ${t.status} | Categoría: ${t.category || 'medio'}`);
        if (t.dueDate) console.log(`     Vence: ${new Date(t.dueDate).toLocaleDateString()}`);
      });
    }
    
    // 4. EVENTOS
    const events = await Event.find({}).populate('project', 'name').limit(5);
    const totalEvents = await Event.countDocuments();
    console.log(`\n📅 EVENTOS (Total: ${totalEvents})`);
    console.log('-'.repeat(70));
    if (events.length > 0) {
      events.forEach((e, i) => {
        const projectName = e.project && e.project.name ? e.project.name : 'Proyecto eliminado';
        console.log(`  ${i + 1}. "${e.title}" - ${projectName}`);
        console.log(`     ${new Date(e.start).toLocaleString()} - ${new Date(e.end).toLocaleString()}`);
      });
    } else {
      console.log('  No hay eventos creados');
    }
    
    // 5. SCRIPTS
    const scripts = await Script.find({}).populate('project', 'name').limit(5);
    const totalScripts = await Script.countDocuments();
    const scriptsByStatus = await Script.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log(`\n📝 SCRIPTS (Total: ${totalScripts})`);
    console.log('-'.repeat(70));
    if (scriptsByStatus.length > 0) {
      scriptsByStatus.forEach(s => {
        console.log(`  ${s._id || 'sin estado'}: ${s.count} scripts`);
      });
    }
    if (scripts.length > 0) {
      console.log('\n  Ejemplos:');
      scripts.forEach((s, i) => {
        const projectName = s.project && s.project.name ? s.project.name : 'Proyecto eliminado';
        console.log(`  ${i + 1}. "${s.title}" - ${projectName}`);
        console.log(`     Versiones: ${s.versions ? s.versions.length : 0} | Comentarios: ${s.comments ? s.comments.length : 0}`);
      });
    }
    
    // 6. INTEGRACIONES
    const integrations = await IntegrationAccount.find({}).populate('user', 'name email').limit(5);
    const totalIntegrations = await IntegrationAccount.countDocuments();
    const integrationsByPlatform = await IntegrationAccount.aggregate([
      { $group: { _id: '$platform', count: { $sum: 1 } } }
    ]);
    console.log(`\n🔗 INTEGRACIONES (Total: ${totalIntegrations})`);
    console.log('-'.repeat(70));
    if (integrationsByPlatform.length > 0) {
      integrationsByPlatform.forEach(i => {
        console.log(`  ${i._id}: ${i.count} cuentas conectadas`);
      });
    }
    if (integrations.length > 0) {
      console.log('\n  Ejemplos:');
      integrations.forEach((acc, i) => {
        const userName = acc.user && acc.user.name ? acc.user.name : acc.user && acc.user.email ? acc.user.email : 'Usuario desconocido';
        const displayName = acc.metadata && (acc.metadata.title || acc.metadata.username || acc.metadata.display_name) || 'Sin nombre';
        console.log(`  ${i + 1}. ${acc.platform.toUpperCase()} - ${displayName}`);
        console.log(`     Usuario: ${userName} | Conectado: ${acc.createdAt.toLocaleDateString()}`);
      });
    } else {
      console.log('  No hay integraciones conectadas');
    }
    
    // 7. MÉTRICAS
    const metrics = await SocialMetric.find({}).populate('project', 'name').limit(5);
    const totalMetrics = await SocialMetric.countDocuments();
    console.log(`\n📊 MÉTRICAS SOCIALES (Total: ${totalMetrics})`);
    console.log('-'.repeat(70));
    if (metrics.length > 0) {
      metrics.forEach((m, i) => {
        const projectName = m.project && m.project.name ? m.project.name : 'Proyecto eliminado';
        console.log(`  ${i + 1}. ${m.platform.toUpperCase()} - ${projectName}`);
        console.log(`     Capturado: ${m.capturedAt.toLocaleString()}`);
      });
    } else {
      console.log('  No hay métricas almacenadas');
    }
    
    // 8. NOTIFICACIONES
    const notifications = await Notification.find({}).populate('user', 'name email').populate('project', 'name').limit(5);
    const totalNotifications = await Notification.countDocuments();
    const unreadNotifications = await Notification.countDocuments({ read: false });
    console.log(`\n🔔 NOTIFICACIONES (Total: ${totalNotifications}, No leídas: ${unreadNotifications})`);
    console.log('-'.repeat(70));
    if (notifications.length > 0) {
      notifications.forEach((n, i) => {
        const userName = n.user && n.user.name ? n.user.name : 'Usuario';
        const projectName = n.project && n.project.name ? n.project.name : '';
        console.log(`  ${i + 1}. ${n.type} - ${userName} ${projectName ? `(${projectName})` : ''}`);
        console.log(`     Leída: ${n.read ? 'Sí' : 'No'} | ${n.createdAt.toLocaleDateString()}`);
      });
    } else {
      console.log('  No hay notificaciones');
    }
    
    // RESUMEN
    console.log('\n' + '='.repeat(70));
    console.log('📈 RESUMEN GENERAL');
    console.log('='.repeat(70));
    console.log(`  👥 Usuarios: ${totalUsers}`);
    console.log(`  📁 Proyectos: ${totalProjects}`);
    console.log(`  ✅ Tareas: ${totalTasks}`);
    console.log(`  📅 Eventos: ${totalEvents}`);
    console.log(`  📝 Scripts: ${totalScripts}`);
    console.log(`  🔗 Integraciones: ${totalIntegrations}`);
    console.log(`  📊 Métricas: ${totalMetrics}`);
    console.log(`  🔔 Notificaciones: ${totalNotifications} (${unreadNotifications} sin leer)`);
    console.log('='.repeat(70));
    
    await mongoose.disconnect();
    console.log('\n✅ Análisis completado\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

analyzeProject();

