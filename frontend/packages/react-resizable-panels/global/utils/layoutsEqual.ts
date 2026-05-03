import type { Layout } from '../../components/group/types';
import { compareLayoutNumbers } from './compareLayoutNumbers';

export function layoutsEqual(a: Layout, b: Layout): boolean {
	if (Object.keys(a).length !== Object.keys(b).length) {
		return false;
	}

	for (const id in a) {
		const sizeA = a[id];
		const sizeB = b[id];

		// Edge case: Panel id has been changed
		if (sizeA === undefined || sizeB === undefined) {
			return false;
		}

		if (compareLayoutNumbers(sizeA, sizeB) !== 0) {
			return false;
		}
	}

	return true;
}
