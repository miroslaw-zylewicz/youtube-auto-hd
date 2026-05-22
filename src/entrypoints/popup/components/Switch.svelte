<script lang="ts">
  import "ccc-components/styles/switch.css";
  import type { Snippet } from "svelte";

  interface Props {
    checked: boolean | null | undefined;
    change?: (isChecked: boolean) => void;
    children?: Snippet;
    className?: string;

    [key: string]: unknown;
  }

  const random = crypto.randomUUID();

  let { checked = $bindable(false), children, className, change, ...rest }: Props = $props();
</script>

<article class="ccc-switch {className}" dir="auto" {...rest}>
  <input
    id="switch-{random}"
    class="ccc-switch__input"
    onchange={e => change?.(e.currentTarget.checked)}
    role="switch"
    type="checkbox"
    bind:checked />
  <label class="ccc-switch__switch" for="switch-{random}"></label>
  <label class="ccc-switch__label" for="switch-{random}"> {@render children?.()}</label>
</article>

<style>
  .ccc-switch {
    --ccc-accent-color: var(--switch-on-thumb-color);

    display: flex;
    flex-direction: row-reverse;
    align-items: center;

    & > * {
      cursor: pointer;
    }

    & .ccc-switch__label {
      width: 100%;
      margin-inline-start: 0;
      padding-inline: 0 21px;
    }
  }
</style>
