type PhotographerOption = {
  // null = a fotós eltávolítása
  id: string | null;
  label: string;
  isCurrent: boolean;
};

export function buildPhotographerOptions(
  photographers: { id: string; nickname: string }[],
  currentId: string | null,
): PhotographerOption[] {
  return [
    ...photographers.map(({ id, nickname }) => ({
      id,
      label: nickname,
      isCurrent: id === currentId,
    })),
    { id: null, label: 'Nincs fotós', isCurrent: currentId == null },
  ];
}
