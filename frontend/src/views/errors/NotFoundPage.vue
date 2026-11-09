<template>
  <section class="not-found" aria-labelledby="not-found-heading">
    <div class="not-found-content">
      <div class="tomato-scene">
        <span class="scene-number" aria-hidden="true">404</span>
        <svg class="lost-tomato" viewBox="0 0 360 310" role="img" aria-labelledby="tomato-title tomato-description">
          <title id="tomato-title">A little tomato looking for its way home</title>
          <desc id="tomato-description">A smiling red tomato with a leafy crown, little boots, and a folded map.</desc>
          <ellipse class="tomato-shadow" cx="180" cy="279" rx="69" ry="10" fill="#000" opacity=".35" />
          <g class="tomato-character">
            <path d="M147 232l-7 30m68-30 8 30" fill="none" stroke="#a6b67e" stroke-width="9" stroke-linecap="round" />
            <path d="M122 266q14-14 29-4l3 9q-15 9-32 2zm82-4q16-11 30 4v7q-17 7-33-2z" fill="#7d8b61" />
            <path d="M105 165q-27-8-35 12m181-12q20-10 32 8" fill="none" stroke="#a6b67e" stroke-width="8" stroke-linecap="round" />
            <path d="M180 83c-32-25-81-4-91 45-13 63 17 119 91 120 74-1 104-57 91-120-10-49-59-70-91-45" fill="#e45a4c" />
            <path d="M249 116c17 65-12 114-77 122 64 14 112-32 99-100-4-21-14-37-27-45z" fill="#c63f39" opacity=".7" />
            <path d="M113 136q2-22 20-30" fill="none" stroke="#ffaaa0" stroke-width="10" stroke-linecap="round" opacity=".7" />
            <g class="tomato-leaves">
              <path d="M179 90q-36 12-56-6l31-9-16-24q30 0 42 21 15-25 43-24l-17 27 32 9q-28 18-57 6" fill="#8fae65" />
              <path d="M181 78q-5-24 11-34" fill="none" stroke="#b7cd85" stroke-width="8" stroke-linecap="round" />
            </g>
            <g class="tomato-eyes" fill="#302b2d">
              <ellipse cx="148" cy="157" rx="6" ry="9" /><ellipse cx="208" cy="157" rx="6" ry="9" />
            </g>
            <ellipse cx="133" cy="177" rx="12" ry="6" fill="#ffb0a0" opacity=".65" /><ellipse cx="222" cy="177" rx="12" ry="6" fill="#ffb0a0" opacity=".65" />
            <path d="M168 177q12 13 24 0" fill="none" stroke="#683b3b" stroke-width="4" stroke-linecap="round" />
            <g class="tomato-map">
              <path d="m48 174 22-8 23 10 22-8v44l-22 8-23-10-22 8z" fill="#e5ddc3" stroke="#b5ad97" stroke-width="2" stroke-linejoin="round" />
              <path d="M70 167v43m23-34v44" stroke="#b5ad97" stroke-width="2" />
              <path d="m56 197 12-7 14 11 19-16" fill="none" stroke="#8b9b75" stroke-width="3" stroke-linecap="round" stroke-dasharray="3 5" />
              <circle cx="100" cy="184" r="4" fill="#c86a56" />
            </g>
          </g>
          <g class="tomato-spark" fill="rgb(var(--v-theme-muted))" opacity=".6"><circle cx="298" cy="91" r="3" /><path d="M57 112v12m-6-6h12M285 226v10m-5-5h10" stroke="#8fae65" stroke-width="2" stroke-linecap="round" /></g>
        </svg>
      </div>
      <div class="not-found-copy">
        <p class="error-label">ERROR 404 · PAGE NOT FOUND</p>
        <h1 id="not-found-heading">A little off the vine.</h1>
        <p class="not-found-message">This tomato took a wrong turn. The page you are looking for does not exist or may have moved.</p>
        <div class="not-found-actions">
          <v-btn color="primary" variant="flat" size="large" prepend-icon="mdi-view-dashboard-outline" to="/dashboard">Go to dashboard</v-btn>
          <v-btn variant="outlined" size="large" prepend-icon="mdi-arrow-left" @click="goBack">Go back</v-btn>
        </div>
        <p class="not-found-hint">Check the address, or head back to a familiar place.</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
const router = useRouter();
function goBack() {
  const previous = window.history.state?.back;
  if (typeof previous === 'string' && previous.startsWith('/') && !previous.startsWith('//')) router.back();
  else router.replace('/dashboard');
}
</script>

<style scoped lang="scss">
p { margin: 0; }
.not-found { min-height: 100svh; min-height: 100vh; display: grid; place-items: center; padding: 40px 24px; background: rgb(var(--v-theme-background)); color: rgb(var(--v-theme-on-background)); }
.not-found-content { display: grid; grid-template-columns: minmax(260px, 380px) minmax(0, 460px); align-items: center; gap: 48px; width: 100%; max-width: 920px; }
.tomato-scene { position: relative; min-width: 0; }.scene-number { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); color: rgb(var(--v-theme-decorative)); font-size: clamp(110px, 17vw, 180px); font-weight: 700; letter-spacing: -.07em; user-select: none; }.lost-tomato { display: block; position: relative; width: 100%; overflow: visible; }
.error-label { font-size: 11px; letter-spacing: .14em; color: rgb(var(--v-theme-secondary)); font-weight: 500; }.not-found-copy h1 { font-size: clamp(28px, 4vw, 42px); line-height: 1.15; font-weight: 500; margin: 16px 0; letter-spacing: -.035em; }.not-found-message { font-size: 16px; color: rgb(var(--v-theme-muted)); line-height: 1.7; max-width: 420px; }.not-found-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }.not-found-actions :deep(.v-btn) { text-transform: none; letter-spacing: normal; border-radius: 4px; }.not-found-hint { color: rgb(var(--v-theme-muted)); font-size: 12px; line-height: 1.6; margin-top: 24px; }
.tomato-character { animation: tomato-float 3.4s ease-in-out infinite; transform-origin: 180px 245px; }.tomato-shadow { animation: tomato-shadow 3.4s ease-in-out infinite; transform-origin: 180px 279px; }.tomato-eyes { animation: tomato-blink 5s ease-in-out infinite; transform-origin: 180px 157px; }.tomato-leaves { animation: tomato-leaves 3.4s ease-in-out infinite; transform-origin: 180px 85px; }
@keyframes tomato-float { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-9px) rotate(2deg); } }
@keyframes tomato-shadow { 0%, 100% { transform: scaleX(1); opacity: .35; } 50% { transform: scaleX(.85); opacity: .22; } }
@keyframes tomato-blink { 0%, 43%, 48%, 100% { transform: scaleY(1); } 45%, 46% { transform: scaleY(.12); } }
@keyframes tomato-leaves { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(4deg); } }
@media (max-width: 700px) { .not-found { padding: 32px 20px; }.not-found-content { grid-template-columns: 1fr; gap: 16px; text-align: center; max-width: 460px; }.tomato-scene { width: min(260px, 85%); margin: 0 auto; }.scene-number { font-size: 140px; top: -18px; }.not-found-message { margin: 0 auto; }.not-found-actions { justify-content: center; } }
@media (prefers-reduced-motion: reduce) { .tomato-character, .tomato-shadow, .tomato-eyes, .tomato-leaves { animation: none; } }
</style>
