import styled, { keyframes } from 'styled-components';
import { assertNever } from '../domain/assertNever';
import type { LayerStatus } from '../domain/layer.types';
import type { MessageKey } from '../i18n/dictionaries';
import type { Translate } from '../i18n/localeStore';

function describe(status: LayerStatus): { tone: Tone; text: MessageKey; detail?: MessageKey } {
  switch (status.kind) {
    case 'idle':
      return { tone: 'muted', text: 'status.idle' };
    case 'loading':
      return { tone: 'accent', text: 'status.loading' };
    case 'success':
      return { tone: 'success', text: 'status.success' };
    case 'error':
      return { tone: 'danger', text: 'status.error', detail: `error.${status.error}` };
    default:
      return assertNever(status);
  }
}

type Tone = 'muted' | 'accent' | 'success' | 'danger';

export function StatusBadge({ status, t }: { status: LayerStatus; t: Translate }) {
  const { tone, text, detail } = describe(status);
  return (
    <Badge $tone={tone} role="status" aria-live="polite" title={detail ? t(detail) : undefined}>
      {status.kind === 'loading' && <Spinner aria-hidden />}
      <span>
        {t(text)}
        {detail && <Detail>: {t(detail)}</Detail>}
      </span>
    </Badge>
  );
}

const spin = keyframes`to { transform: rotate(360deg); }`;

const Badge = styled.span<{ $tone: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme, $tone }) => ($tone === 'muted' ? theme.color.muted : theme.color[$tone])};
`;

const Detail = styled.span`
  @media (max-width: 420px) {
    display: none;
  }
`;

const Spinner = styled.span`
  width: 10px;
  height: 10px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;
