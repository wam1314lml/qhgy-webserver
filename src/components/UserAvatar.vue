<template>
  <div
    :class="[
      'rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300',
      {
        'w-10 h-10 max-sm:w-9 max-sm:h-9 cursor-pointer hover:shadow-lg hover:shadow-blue-400/40':
          size === 'small',
        'w-15 h-15 md:w-12 md:h-12 max-sm:w-11 max-sm:h-11': size === 'large',
      },
    ]"
  >
    <img
      src="/images/avatar.gif"
      alt="用户头像"
      :class="[
        'rounded-full object-cover',
        {
          'w-10 h-10 max-sm:w-9 max-sm:h-9': size === 'small',
          'w-15 h-15 md:w-12 md:h-12 max-sm:w-11 max-sm:h-11': size === 'large',
        },
      ]"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'small' | 'large'
}

withDefaults(defineProps<Props>(), {
  size: 'small',
})
</script>
