/**
 * useAiSheet — Phase 3b helper.
 *
 * Single hook that owns the visibility + initial-prompt state for an
 * AskAi sheet on a screen. Lets a screen mount one <AiBottomSheet />
 * and trigger it from many places (cards, long-presses, header pill).
 */
import { useCallback, useState } from 'react';

export type AiSheetState = {
  visible: boolean;
  prompt: string;
  open: (prompt?: string) => void;
  close: () => void;
};

export function useAiSheet(defaultPrompt = ''): AiSheetState {
  const [visible, setVisible] = useState(false);
  const [prompt, setPrompt] = useState(defaultPrompt);

  const open = useCallback(
    (next?: string) => {
      setPrompt(next ?? defaultPrompt);
      setVisible(true);
    },
    [defaultPrompt],
  );

  const close = useCallback(() => setVisible(false), []);

  return { visible, prompt, open, close };
}
