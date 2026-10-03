<script setup lang="ts">
// CRUD de reportes de puntualidad. Reutiliza el componente genérico: los
// campos y las etiquetas salen de shared/gestion.ts.
definePageMeta({ layout: "dashboard", capability: "fleet:manage" });
</script>

<template>
	<GestionCrud resource="reports" />
</template>
