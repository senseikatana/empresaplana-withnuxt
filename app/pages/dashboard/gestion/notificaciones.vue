<script setup lang="ts">
// CRUD de notificaciones. Los campos Título y Descripción llevan asistencia
// IA: aquí sí aporta, porque el contenido es redactable (a diferencia de un
// número de autobús o una hora, que son datos que la IA no puede conocer).
definePageMeta({ layout: "dashboard", capability: "fleet:manage" });
</script>

<template>
	<GestionCrud resource="notifications" />
</template>
