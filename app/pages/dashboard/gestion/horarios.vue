<script setup lang="ts">
// Sección CRUD de gestión (lista + formulario). El componente es el
// mismo para todas: se configura con el registro de shared/gestion.ts.
definePageMeta({ layout: "dashboard", capability: "fleet:manage" });
</script>

<template>
	<GestionCrud resource="schedules" />
</template>
