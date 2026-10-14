import { describe, expectTypeOf, it } from 'vitest';
import { translate } from '../i18n/localeStore';
import { readLayer } from '../store/layerActions';
import type { LayersStore } from '../store/layersStore';
import type { LayerId, LayerState, LayerStatus } from './layer.types';
import { toLayerId } from './layer.types';

/** Checked by `tsc` (src is type-checked); the runtime bodies are trivial. */
describe('type safety', () => {
  it('layer ids are branded', () => {
    expectTypeOf(toLayerId('a')).toEqualTypeOf<LayerId>();
    expectTypeOf<string>().not.toExtend<LayerId>();
    expectTypeOf(readLayer).parameter(1).toEqualTypeOf<LayerId>();

    const check = (store: LayersStore) => {
      // @ts-expect-error a plain string is not a LayerId
      readLayer(store, 'temperature');
    };
    expectTypeOf(check).toBeFunction();
  });

  it('error details exist only on the error status', () => {
    type ErrorStatus = Extract<LayerStatus, { kind: 'error' }>;
    expectTypeOf<ErrorStatus['error']>().toEqualTypeOf<'network' | 'server' | 'timeout'>();
    expectTypeOf<Extract<LayerStatus, { kind: 'idle' }>>().not.toHaveProperty('requestId');
  });

  it('state is read-only and opacity is a number', () => {
    expectTypeOf<LayerState['opacity']>().toEqualTypeOf<number>();
    const mutate = (layer: LayerState) => {
      // @ts-expect-error state objects are readonly
      layer.enabled = true;
    };
    expectTypeOf(mutate).toBeFunction();
  });

  it('translation keys are checked', () => {
    // @ts-expect-error unknown message key
    const call = () => translate('en', 'no.such.key');
    expectTypeOf(call).toBeFunction();
  });
});
