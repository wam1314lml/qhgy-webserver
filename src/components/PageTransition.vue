<template>
  <transition :name="transitionName" mode="out-in">
    <div :key="pageKey">
      <slot />
    </div>
  </transition>
</template>

<script setup lang="ts">
interface Props {
  pageKey: string
  direction?: 'left' | 'right'
}

const props = withDefaults(defineProps<Props>(), {
  direction: 'left'
})

const transitionName = `slide-${props.direction}`
</script>

<style scoped>
@import './PageTransition.css';
</style>