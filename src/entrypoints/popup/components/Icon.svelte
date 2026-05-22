<script lang="ts">
  interface Props {
    path?: string;
  }

  const { path = "" }: Props = $props();

  const SIZE = 24;
</script>

<svg aria-hidden="true" focusable="false" height="{SIZE}px" width="{SIZE}px" xmlns="http://www.w3.org/2000/svg">
  <path d={path} />
</svg>

<style>
  svg {
    margin-inline-end: 10px;
  }

  path {
    fill: currentColor;
  }
</style>
