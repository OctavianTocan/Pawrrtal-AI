<script setup>
import { ref, onMounted } from "vue";

const bridge = ref("checking...");

onMounted(() => {
  bridge.value = window.zero ? "available" : "not enabled";
});
</script>

<template>
  <main>
    <p class="eyebrow">zero-native + Vue</p>
    <h1>App</h1>
    <p class="lede">A Vue frontend running inside the system WebView.</p>
    <div class="card">
      <span>Native bridge</span>
      <strong>{{ bridge }}</strong>
    </div>
  </main>
</template>
