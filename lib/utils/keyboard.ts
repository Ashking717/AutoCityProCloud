export function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest(
      [
        "input",
        "textarea",
        "select",
        "[contenteditable='true']",
        "[contenteditable='']",
        "[role='textbox']",
        "[data-ignore-global-shortcuts='true']",
      ].join(",")
    )
  );
}

export function isInteractiveKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const interactiveTarget = target.closest(
    [
      "button",
      "a[href]",
      "summary",
      "[role='button']",
      "[role='link']",
      "[role='menuitem']",
      "[role='option']",
      "[tabindex]:not([tabindex='-1'])",
      "[data-ignore-global-shortcuts='true']",
    ].join(",")
  );

  return Boolean(interactiveTarget);
}

export function hasShortcutModifier(event: KeyboardEvent) {
  return event.ctrlKey || event.metaKey || event.altKey;
}

export function shouldIgnoreGlobalShortcut(
  event: KeyboardEvent,
  options: { allowEscapeFromInputs?: boolean; ignoreInteractiveTargets?: boolean } = {}
) {
  if (event.defaultPrevented || event.isComposing) return true;
  if (options.allowEscapeFromInputs && event.key === "Escape") return false;
  if (isEditableKeyboardTarget(event.target)) return true;
  return options.ignoreInteractiveTargets !== false && isInteractiveKeyboardTarget(event.target);
}

export function isActivationKey(key: string) {
  return key === "Enter" || key === " " || key === "Spacebar";
}
