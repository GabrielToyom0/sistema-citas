'use strict';

// Test roto a propósito para la evidencia K-04 (el CI debe bloquear el PR). NO FUSIONAR.
const test = require('node:test');
const assert = require('node:assert/strict');

test('prueba de CI: debe fallar', () => assert.equal(1, 2));
