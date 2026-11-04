import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPickerEligible } from './pickerUsers.ts';

void test('isPickerEligible includes active full members', () => {
  assert.equal(
    isPickerEligible({ id: 'a', archived: false, approved: true, emailVerified: true }, []),
    true,
  );
});

void test('isPickerEligible excludes pending and archived unless already selected', () => {
  assert.equal(
    isPickerEligible({ id: 'a', archived: false, approved: false, emailVerified: true }, []),
    false,
  );
  assert.equal(
    isPickerEligible({ id: 'a', archived: false, approved: true, emailVerified: false }, []),
    false,
  );
  assert.equal(
    isPickerEligible({ id: 'a', archived: true, approved: true, emailVerified: true }, []),
    false,
  );
  assert.equal(
    isPickerEligible({ id: 'a', archived: true, approved: true, emailVerified: true }, ['a']),
    true,
  );
  assert.equal(
    isPickerEligible({ id: 'a', archived: false, approved: false, emailVerified: false }, ['a']),
    true,
  );
});
